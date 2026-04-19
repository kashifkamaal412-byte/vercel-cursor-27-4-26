-- Fix overly permissive watch_time SELECT policy
-- Current policy allows ALL authenticated users to view watch time data
-- New policy restricts to video owners only

DROP POLICY IF EXISTS "Watch time viewable by video owner" ON public.watch_time;

CREATE POLICY "Watch time viewable by video owner"
ON public.watch_time FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM videos WHERE id = watch_time.video_id
  )
);