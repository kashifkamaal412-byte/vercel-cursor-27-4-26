-- Fix the SECURITY DEFINER view issue by recreating with SECURITY INVOKER
-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate the view with SECURITY INVOKER (default, but explicit)
-- This ensures the view uses the caller's permissions, not the definer's
CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.cover_url,
  p.website,
  p.instagram,
  p.twitter,
  p.youtube,
  p.tiktok,
  p.activity_status,
  p.username,
  p.creator_score,
  p.trust_level,
  p.total_views,
  p.total_likes,
  p.total_followers,
  p.total_following,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.privacy_settings ps ON ps.user_id = p.user_id
LEFT JOIN public.blocked_users bu ON bu.blocked_id = p.user_id AND bu.blocker_id = auth.uid()
WHERE 
  -- Exclude blocked users (when viewing as authenticated user)
  bu.id IS NULL
  AND (
    -- Always show own profile
    p.user_id = auth.uid()
    -- Show public profiles
    OR COALESCE(ps.profile_visibility, 'public') = 'public'
    -- Show friends-only profiles to followers
    OR (
      COALESCE(ps.profile_visibility, 'public') = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.follows f 
        WHERE f.follower_id = auth.uid() AND f.following_id = p.user_id
      )
    )
  );

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;