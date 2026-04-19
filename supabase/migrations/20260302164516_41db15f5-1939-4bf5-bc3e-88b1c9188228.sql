-- Add RLS policies to audience_analytics table (resolves "RLS Enabled No Policy" linter warning)
-- SELECT: only the video owner can view analytics for their videos
CREATE POLICY "Video owners can view audience analytics"
ON public.audience_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = audience_analytics.video_id
      AND v.user_id = auth.uid()
  )
);

-- No INSERT/UPDATE/DELETE policies: data is only written by backend/triggers