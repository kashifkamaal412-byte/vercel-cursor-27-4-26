import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restricts cross-origin requests to trusted domains
const allowedOrigins = [
  'https://id-preview--03dda6d1-e2fa-4e50-a1bd-5e8508198fa1.lovable.app',
  'https://shortly.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface RenderRequest {
  action: 'render' | 'status' | 'transfer';
  videoUrl?: string;
  editSettings?: {
    trimStart: number;
    trimEnd: number;
    aspectRatio: string;
    audioUrl?: string;
    audioVolume?: number;
  };
  renderId?: string;
  sourceUrl?: string; // For transfer action - the temporary Shotstack URL
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SHOTSTACK_API_KEY = Deno.env.get('SHOTSTACK_API_KEY');
    if (!SHOTSTACK_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Shotstack API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, videoUrl, editSettings, renderId, sourceUrl } = await req.json() as RenderRequest;
    const SHOTSTACK_BASE_URL = 'https://api.shotstack.io/edit/stage/render';
    // Transfer rendered video from Shotstack to Supabase Storage
    if (action === 'transfer') {
      if (!sourceUrl) {
        return new Response(
          JSON.stringify({ error: 'Source URL required for transfer' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Transferring video to permanent storage for user:', user.id);

      // Validate sourceUrl to prevent SSRF — only allow Shotstack CDN domains over HTTPS
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(sourceUrl);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid source URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allowedHosts = ['cdn.shotstack.io', 'api.shotstack.io', 'shotstack-api-stage-output.s3-ap-southeast-2.amazonaws.com', 'shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com'];
      if (parsedUrl.protocol !== 'https:' || !allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h))) {
        return new Response(
          JSON.stringify({ error: 'Source URL not from allowed domain' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Download the video from Shotstack's temporary URL
      const videoResponse = await fetch(sourceUrl);
      if (!videoResponse.ok) {
        console.error('Failed to download video from Shotstack:', videoResponse.status);
        return new Response(
          JSON.stringify({ error: 'Failed to download video from source' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videoBlob = await videoResponse.blob();
      const videoBuffer = await videoBlob.arrayBuffer();
      
      // Use service role client for storage upload
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      const fileName = `${user.id}/edited_${Date.now()}.mp4`;
      
      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('videos')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Failed to upload to storage:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload video to storage' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return the storage path (not public URL) - client resolves via signed URLs
      console.log('Video transferred successfully:', uploadData.path);

      return new Response(
        JSON.stringify({ 
          success: true, 
          permanentUrl: uploadData.path,
          path: uploadData.path
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'render') {
      console.log('Starting Shotstack render for user:', user.id);

      // Validate that the video URL belongs to the authenticated user
      if (videoUrl) {
        // Check if video exists in our database and belongs to this user
        const { data: videoRecord } = await supabaseClient
          .from('videos')
          .select('user_id')
          .eq('video_url', videoUrl)
          .maybeSingle();

        // If video is in our DB but belongs to another user, reject
        if (videoRecord && videoRecord.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'You can only edit your own videos' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Also check if it's a Supabase storage URL in another user's folder
        const supabaseStoragePattern = /\/storage\/v1\/object\/public\/videos\/([^/]+)\//;
        const match = videoUrl.match(supabaseStoragePattern);
        if (match && match[1] !== user.id) {
          return new Response(
            JSON.stringify({ error: 'You can only edit your own videos' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const timeline = buildShotstackTimeline(videoUrl!, editSettings!);

      const renderPayload = {
        timeline,
        output: {
          format: 'mp4',
          resolution: 'hd',
          aspectRatio: editSettings?.aspectRatio || '9:16',
        },
      };

      const renderResponse = await fetch(`${SHOTSTACK_BASE_URL}/render`, {
        method: 'POST',
        headers: {
          'x-api-key': SHOTSTACK_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(renderPayload),
      });

      if (!renderResponse.ok) {
        const errorText = await renderResponse.text();
        console.error('Shotstack render error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to start render' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const renderData = await renderResponse.json();
      const newRenderId = renderData.response.id;
      console.log('Render started:', newRenderId);

      // Persist render job ownership for status checks
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      await adminClient.from('render_jobs').insert({
        render_id: newRenderId,
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          renderId: newRenderId,
          message: renderData.response.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      if (!renderId || typeof renderId !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Render ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the authenticated user owns this render job
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: job } = await adminClient
        .from('render_jobs')
        .select('user_id')
        .eq('render_id', renderId)
        .maybeSingle();

      if (!job || job.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Render job not found' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusResponse = await fetch(`${SHOTSTACK_BASE_URL}/render/${renderId}`, {
        method: 'GET',
        headers: { 'x-api-key': SHOTSTACK_API_KEY },
      });

      if (!statusResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to get render status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusData = await statusResponse.json();

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: statusData.response.status,
          url: statusData.response.url,
          progress: statusData.response.progress || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Shotstack function error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

function buildShotstackTimeline(videoUrl: string, settings: RenderRequest['editSettings']) {
  if (!settings) {
    return {
      tracks: [{
        clips: [{
          asset: { type: 'video', src: videoUrl },
          start: 0,
          length: 'auto',
        }],
      }],
    };
  }

  const { trimStart, trimEnd, audioUrl, audioVolume } = settings;

  const videoClip: any = {
    asset: {
      type: 'video',
      src: videoUrl,
      trim: trimStart > 0 ? trimStart : undefined,
    },
    start: 0,
    length: trimEnd > 0 ? trimEnd - trimStart : 'auto',
  };

  const tracks: any[] = [{ clips: [videoClip] }];

  // Add audio overlay if provided
  if (audioUrl) {
    tracks.push({
      clips: [{
        asset: {
          type: 'audio',
          src: audioUrl,
          volume: audioVolume ?? 0.5,
        },
        start: 0,
        length: 'auto',
      }],
    });
  }

  return { tracks };
}
