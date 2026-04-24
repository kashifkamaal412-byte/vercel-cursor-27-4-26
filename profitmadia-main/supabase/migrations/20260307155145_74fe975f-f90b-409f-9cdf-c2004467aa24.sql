-- Fix INFO finding: RLS enabled but no policies on audience_analytics
-- Keep table write-protected (no INSERT/UPDATE/DELETE policies)
-- Only allow video owners to read analytics for their own videos.

CREATE POLICY "Video owners can view audience analytics"
ON public.audience_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = audience_analytics.video_id
      AND v.user_id = auth.uid()
  )
);