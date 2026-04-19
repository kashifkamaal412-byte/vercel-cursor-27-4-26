-- Remove sensitive tables from Realtime to prevent data leakage
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_log; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Replace public_profile_view to hide earnings
DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view AS
SELECT
  id, user_id, display_name, username, bio, avatar_url, cover_url,
  website, instagram, twitter, youtube, tiktok,
  activity_status, creator_score, trust_level,
  total_views, total_likes, total_followers, total_following,
  0::integer AS total_gifts,
  0::numeric AS total_earnings,
  created_at, updated_at
FROM public.profiles;