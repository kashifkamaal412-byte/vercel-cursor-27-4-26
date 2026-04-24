DROP POLICY IF EXISTS "Analytics viewable by everyone" ON public.audience_analytics;

CREATE POLICY "Video owners can view own analytics"
ON public.audience_analytics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = audience_analytics.video_id
    AND v.user_id = auth.uid()
  )
);