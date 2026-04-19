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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ reply: "Authentication required. Please sign in." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ reply: "Invalid authentication. Please sign in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Rate limit check
    const { data: canProceed } = await supabaseClient.rpc("check_rate_limit", {
      _user_id: userId,
      _action_type: "support_chat",
      _max_actions: 10,
      _window_minutes: 60,
    });

    if (!canProceed) {
      return new Response(
        JSON.stringify({ reply: "You've sent too many messages. Please wait before trying again. 🙏" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ reply: "Invalid request." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gemini API key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY missing in secrets");
      return new Response(
        JSON.stringify({ reply: "Support chat is temporarily unavailable (missing API key). Please try again later." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // System prompt
    const systemPrompt = `You are a friendly support assistant for "Shortly", a short‑video app. Always respond positively, highlight features, reassure about security, and encourage earning. Answer in the user's language.`;

    // Prepare messages for Gemini
    const geminiMessages = [{ role: "system", content: systemPrompt }, ...messages.filter((m) => m.role !== "system")];

    // Convert to Gemini's expected format
    const geminiContents = [];
    for (const msg of geminiMessages) {
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    console.log("Calling Gemini API...");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("❌ Gemini API error:", geminiResponse.status, errorText);
      return new Response(JSON.stringify({ reply: "AI service is temporarily unavailable. Please try again later." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Thanks for reaching out! 😊";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("🔥 support-chat error:", e);
    return new Response(JSON.stringify({ reply: "Internal error. Please try again." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
