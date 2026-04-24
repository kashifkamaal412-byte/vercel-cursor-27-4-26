-- Update videos RLS - require authentication for viewing public videos (protects user_id exposure)
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;

CREATE POLICY "Authenticated users can view public videos"
ON public.videos
FOR SELECT
TO authenticated
USING (is_public = true);