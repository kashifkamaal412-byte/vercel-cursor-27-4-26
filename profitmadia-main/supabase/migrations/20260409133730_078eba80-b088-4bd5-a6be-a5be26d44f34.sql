
DROP VIEW IF EXISTS public.public_profile_view;

CREATE VIEW public.public_profile_view AS
SELECT
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  instagram,
  twitter,
  youtube,
  tiktok,
  website,
  activity_status,
  creator_score,
  trust_level,
  total_followers,
  total_following,
  total_likes,
  total_views,
  created_at,
  updated_at
FROM public.profiles;
