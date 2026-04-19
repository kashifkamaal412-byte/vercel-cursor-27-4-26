DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view WITH (security_invoker = true) AS
SELECT
  id, user_id, display_name, username, bio, avatar_url, cover_url,
  website, instagram, twitter, youtube, tiktok,
  activity_status, creator_score, trust_level,
  total_views, total_likes, total_followers, total_following,
  0::integer AS total_gifts,
  0::numeric AS total_earnings,
  created_at, updated_at
FROM public.profiles;