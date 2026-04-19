-- Fix the SECURITY DEFINER view warning by recreating as SECURITY INVOKER
-- Drop and recreate the view with proper security context
DROP VIEW IF EXISTS public.public_videos;

CREATE VIEW public.public_videos
WITH (security_invoker = true) AS
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
COMMENT ON VIEW public.public_videos IS 'Secure public view of videos using SECURITY INVOKER - hides user_id from anonymous users and restricts sensitive engagement metrics to video owners only';