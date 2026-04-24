-- ====================================
-- FIX 1: Likes Table Privacy Leak
-- Restrict likes visibility to own likes OR video owner
-- ====================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.likes;

-- Create proper restrictive policy: users can see their own likes, or video owners can see likes on their videos
CREATE POLICY "Users can view own likes or video owners can view likes on their videos"
ON public.likes
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  auth.uid() IN (SELECT v.user_id FROM public.videos v WHERE v.id = video_id)
);

-- ====================================
-- FIX 2 & 3: Videos Table - Create Public View for Safe Access
-- This creates a view that:
-- - Hides sensitive metrics from anonymous users
-- - Only shows necessary fields for public video browsing
-- ====================================

-- Create a secure public videos view that excludes sensitive data for anonymous users
CREATE OR REPLACE VIEW public.public_videos AS
SELECT 
  id,
  -- Only show user_id to authenticated users, null for anonymous
  CASE WHEN auth.uid() IS NOT NULL THEN user_id ELSE NULL END as user_id,
  video_url,
  thumbnail_url,
  caption,
  tags,
  music_title,
  duration,
  -- Only show engagement metrics to authenticated users
  CASE WHEN auth.uid() IS NOT NULL THEN view_count ELSE 0 END as view_count,
  CASE WHEN auth.uid() IS NOT NULL THEN like_count ELSE 0 END as like_count,
  CASE WHEN auth.uid() IS NOT NULL THEN comment_count ELSE 0 END as comment_count,
  -- Hide competitive metrics from everyone except video owner
  CASE WHEN auth.uid() = user_id THEN share_count ELSE 0 END as share_count,
  CASE WHEN auth.uid() = user_id THEN save_count ELSE 0 END as save_count,
  CASE WHEN auth.uid() = user_id THEN gift_count ELSE 0 END as gift_count,
  CASE WHEN auth.uid() = user_id THEN total_watch_time ELSE 0 END as total_watch_time,
  is_public,
  allow_comments,
  allow_duet,
  video_type,
  status,
  created_at,
  is_trending
FROM public.videos
WHERE is_public = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_videos TO anon;
GRANT SELECT ON public.public_videos TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_videos IS 'Secure public view of videos that hides user_id from anonymous users and restricts sensitive engagement metrics to video owners only';