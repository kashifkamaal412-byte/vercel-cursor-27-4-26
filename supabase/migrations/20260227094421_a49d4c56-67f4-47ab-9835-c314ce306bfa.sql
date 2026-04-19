-- Fix: watch_time SELECT policy is too permissive (USING true)
-- Restrict to video owners only
DROP POLICY IF EXISTS "Watch time viewable by video owner" ON public.watch_time;

CREATE POLICY "Watch time viewable by video owner" ON public.watch_time
FOR SELECT USING (
  auth.uid() IN (
    SELECT videos.user_id FROM videos WHERE videos.id = watch_time.video_id
  )
);