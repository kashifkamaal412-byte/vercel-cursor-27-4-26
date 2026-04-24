
-- Recreate public_profile_view to exclude financial data (total_earnings, total_gifts)
DROP VIEW IF EXISTS public.public_profile_view;

CREATE VIEW public.public_profile_view
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.user_id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.cover_url,
  p.website,
  p.instagram,
  p.twitter,
  p.youtube,
  p.tiktok,
  p.creator_score,
  p.trust_level,
  p.activity_status,
  p.total_views,
  p.total_likes,
  p.total_followers,
  p.total_following,
  p.created_at,
  p.updated_at
FROM public.profiles p;
