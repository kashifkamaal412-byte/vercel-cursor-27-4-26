import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://shortly.lovable.app",
  "https://id-preview--03dda6d1-e2fa-4e50-a1bd-5e8508198fa1.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reporterId = claimsData.claims.sub;

    const body = await req.json();
    const { action, videoId, reason, caption, creatorId } = body;

    if (action !== "report" || !videoId || !reason || !creatorId) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize inputs
    const sanitizedReason = String(reason).slice(0, 500).trim();
    const sanitizedCaption = String(caption || "").slice(0, 500).trim();

    // Rate limit: 5 reports per hour per user
    const { data: canReport } = await supabaseClient.rpc("check_rate_limit", {
      _user_id: reporterId,
      _action_type: "report_video",
      _max_actions: 5,
      _window_minutes: 60,
    });

    if (!canReport) {
      return new Response(
        JSON.stringify({ error: "Too many reports. Please wait before reporting again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI (Gemini) to analyze the report
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get creator's prior warnings from admin service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: priorAlerts } = await adminClient
      .from("ai_alerts")
      .select("id, severity, alert_type")
      .eq("metadata->>target_user_id", creatorId)
      .eq("alert_type", "content_report");

    const warningCount = priorAlerts?.length || 0;

    const moderationPrompt = `You are an AI content moderator for "Shortly", a short-video social app.

A user has reported a video. Analyze the report and decide:
1. Is this report legitimate or made out of personal enmity/fake reasons?
2. If legitimate, what action should be taken?

REPORT DETAILS:
- Reason: ${sanitizedReason}
- Video caption: ${sanitizedCaption}
- Prior warnings for this creator: ${warningCount}

PUNISHMENT RULES:
- If report seems fake/personal enmity: action = "dismiss"
- 1st legitimate offense (0 prior warnings): action = "warning" 
- 2nd legitimate offense (1 prior warning): action = "remove_video"
- 3rd+ legitimate offense (2+ prior warnings): action = "ban_account"

Respond with ONLY a JSON object (no markdown):
{"action": "dismiss|warning|remove_video|ban_account", "reasoning": "brief explanation", "is_legitimate": true/false}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: moderationPrompt }],
      }),
    });

    let moderationAction = "warning";
    let reasoning = "Pending manual review";

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      
      try {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          moderationAction = parsed.action || "warning";
          reasoning = parsed.reasoning || "AI reviewed";
        }
      } catch {
        console.error("Failed to parse AI response, defaulting to warning");
      }
    }

    // Log the report as an AI alert (using admin client to bypass RLS)
    await adminClient.from("ai_alerts").insert({
      alert_type: "content_report",
      severity: moderationAction === "ban_account" ? "critical" : moderationAction === "remove_video" ? "high" : "medium",
      title: `Video Report: ${sanitizedReason}`,
      description: reasoning,
      metadata: {
        video_id: videoId,
        reporter_id: reporterId,
        target_user_id: creatorId,
        reason: sanitizedReason,
        ai_action: moderationAction,
        prior_warnings: warningCount,
      },
    });

    // Execute action if legitimate
    if (moderationAction === "remove_video") {
      await adminClient.from("videos").update({ is_public: false }).eq("id", videoId);
    }
    // For ban_account, we log it for admin review rather than auto-banning

    return new Response(
      JSON.stringify({
        success: true,
        action: moderationAction,
        message: "Report submitted for review.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-moderator error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to process report" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
