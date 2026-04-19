-- Fix 1: Add SELECT policy for audience_analytics to allow video owners to view analytics
-- This restores functionality broken by migration 20260121063320
CREATE POLICY "Video owners can view analytics for their videos"
ON public.audience_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.videos v 
    WHERE v.id = audience_analytics.video_id 
    AND v.user_id = auth.uid()
  )
);

-- Fix 2: Restrict public video access to require authentication
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public Read Access" ON public.videos;

-- Create new policy: Authenticated users can view public videos
CREATE POLICY "Authenticated users can view public videos"
ON public.videos
FOR SELECT
TO authenticated
USING (is_public = true);

-- Keep existing policy "Users can view their own videos" for private videos

-- Fix 3: The audience_analytics SELECT policy above also addresses the exposed sensitive data issue
-- The policy ensures only video owners can access their analytics data