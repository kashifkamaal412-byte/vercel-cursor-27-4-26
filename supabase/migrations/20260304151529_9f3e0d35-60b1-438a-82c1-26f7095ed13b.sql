-- Fix overly permissive gifts SELECT policy
DROP POLICY IF EXISTS "Gifts are viewable by everyone" ON public.gifts;

-- Fix overly permissive watch_time SELECT policy (USING true)
DROP POLICY IF EXISTS "Watch time viewable by video owner" ON public.watch_time;

-- Recreate watch_time SELECT policy restricted to video owner only
CREATE POLICY "Watch time viewable by video owner"
  ON public.watch_time FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT videos.user_id FROM videos WHERE videos.id = watch_time.video_id
  ));