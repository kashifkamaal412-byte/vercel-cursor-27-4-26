-- VIDEOS TABLE: Allow anonymous users to view public videos
DROP POLICY IF EXISTS "Authenticated users can view public videos" ON public.videos;

CREATE POLICY "Public Read Access" 
  ON public.videos 
  FOR SELECT 
  TO anon, authenticated
  USING (is_public = true);

-- PROFILES TABLE: Allow anonymous users to view profiles  
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Public Read Access"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);