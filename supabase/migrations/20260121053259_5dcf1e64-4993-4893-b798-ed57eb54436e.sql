-- Fix: Comments should only be visible when the associated video is accessible
-- Current policy allows any authenticated user to read ALL comments, even on private videos

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;

-- Create new policy that restricts comment visibility based on video accessibility
CREATE POLICY "Users can view comments on accessible videos"
ON public.comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = comments.video_id
    AND (videos.is_public = true OR videos.user_id = auth.uid())
  )
);