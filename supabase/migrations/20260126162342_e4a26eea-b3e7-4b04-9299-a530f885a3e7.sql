-- Fix 1: Drop and recreate public_videos view with SECURITY INVOKER
-- This view hides user_id from anonymous users while allowing authenticated access

DROP VIEW IF EXISTS public.public_videos;

CREATE VIEW public.public_videos
WITH (security_invoker = on) AS
SELECT 
  v.id,
  -- Only show user_id to authenticated users, NULL for anonymous
  CASE WHEN auth.uid() IS NOT NULL THEN v.user_id ELSE NULL END as user_id,
  v.video_url,
  v.thumbnail_url,
  v.caption,
  v.tags,
  v.music_title,
  v.duration,
  v.view_count,
  v.like_count,
  v.comment_count,
  -- Hide sensitive metrics from anonymous users
  CASE WHEN auth.uid() IS NOT NULL THEN v.share_count ELSE NULL END as share_count,
  CASE WHEN auth.uid() IS NOT NULL THEN v.save_count ELSE NULL END as save_count,
  CASE WHEN auth.uid() IS NOT NULL THEN v.gift_count ELSE NULL END as gift_count,
  CASE WHEN auth.uid() IS NOT NULL THEN v.total_watch_time ELSE NULL END as total_watch_time,
  v.is_public,
  v.allow_comments,
  v.allow_duet,
  v.video_type,
  v.status,
  v.is_trending,
  v.created_at
FROM public.videos v
WHERE v.is_public = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_videos TO anon, authenticated;