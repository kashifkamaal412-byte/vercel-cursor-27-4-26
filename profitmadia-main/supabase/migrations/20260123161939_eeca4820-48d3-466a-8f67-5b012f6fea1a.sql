-- Drop the authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view public videos" ON public.videos;

-- Create a new policy that allows anyone (including anonymous) to view public videos
CREATE POLICY "Anyone can view public videos" 
ON public.videos 
FOR SELECT 
USING (is_public = true);