-- Fix #1: Drop and recreate public_profile_view with SECURITY INVOKER
-- This ensures the view respects the underlying profiles table RLS policies
DROP VIEW IF EXISTS public.public_profile_view;

CREATE OR REPLACE VIEW public.public_profile_view
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.username,
  p.bio,
  p.avatar_url,
  p.cover_url,
  p.website,
  p.instagram,
  p.twitter,
  p.youtube,
  p.tiktok,
  p.activity_status,
  p.creator_score,
  p.trust_level,
  p.total_views,
  p.total_likes,
  p.total_followers,
  p.total_following,
  p.created_at,
  p.updated_at,
  -- Mask sensitive financial data - only visible to profile owner
  CASE 
    WHEN auth.uid() = p.user_id THEN p.total_gifts 
    ELSE NULL 
  END as total_gifts,
  CASE 
    WHEN auth.uid() = p.user_id THEN p.total_earnings 
    ELSE NULL 
  END as total_earnings
FROM public.profiles p;

-- Add comment explaining security
COMMENT ON VIEW public.public_profile_view IS 'Secure profile view with SECURITY INVOKER - inherits RLS from profiles table and masks financial data for non-owners';

-- Fix #2: Ensure profiles table only allows authenticated access
-- First check if there's an overly permissive policy and drop it
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;

-- Ensure the authenticated-only policy exists (it should already exist based on context)
-- This policy requires authentication AND respects privacy settings
DO $$
BEGIN
  -- Check if the privacy-respecting policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view profiles respecting privacy'
  ) THEN
    -- If not, create it
    CREATE POLICY "Users can view profiles respecting privacy"
    ON public.profiles FOR SELECT
    USING (
      -- User must be authenticated
      auth.uid() IS NOT NULL
      AND
      -- Not blocked by profile owner
      NOT EXISTS (
        SELECT 1 FROM blocked_users bu
        WHERE bu.blocker_id = profiles.user_id AND bu.blocked_id = auth.uid()
      )
      AND
      (
        -- Own profile - always visible
        user_id = auth.uid()
        OR
        -- Public profile
        COALESCE((SELECT profile_visibility FROM privacy_settings WHERE user_id = profiles.user_id), 'public') = 'public'
        OR
        -- Friends profile with mutual follow
        (
          COALESCE((SELECT profile_visibility FROM privacy_settings WHERE user_id = profiles.user_id), 'public') = 'friends'
          AND EXISTS (
            SELECT 1 FROM follows f1
            JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
            WHERE f1.follower_id = auth.uid() AND f1.following_id = profiles.user_id
          )
        )
      )
    );
  END IF;
END $$;