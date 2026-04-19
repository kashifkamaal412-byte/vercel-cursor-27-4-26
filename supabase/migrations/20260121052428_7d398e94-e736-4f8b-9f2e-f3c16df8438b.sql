-- Fix 1: Update profiles_public view to exclude sensitive financial data
-- This view already excludes total_earnings and total_gifts (verified in schema)
-- But we need to ensure proper access via the view

-- Fix 2: Restrict audience_analytics INSERT to only allow users to insert their own viewing data
DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON public.audience_analytics;

CREATE POLICY "Users can only insert their own analytics"
ON public.audience_analytics
FOR INSERT
TO authenticated
WITH CHECK (
  -- Either viewer_id is null (anonymous tracking) or it must match the current user
  (viewer_id IS NULL) OR (viewer_id = auth.uid())
);

-- Fix 3: The profiles_public is a VIEW (not a table), so RLS doesn't apply directly to it.
-- The view was created to expose only safe public profile data.
-- We need to recreate it to ensure it only shows profiles respecting privacy settings and blocking.

-- First, drop the existing view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate the view with privacy-aware filtering (excludes sensitive financial data)
-- Users can see profiles that are either:
-- 1. Their own profile
-- 2. Public profiles (profile_visibility = 'public')
-- 3. Profiles of users they follow (if profile_visibility = 'friends')
-- The view excludes total_earnings and total_gifts for non-owners
CREATE VIEW public.profiles_public AS
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

-- Also update the main profiles table RLS to protect sensitive financial data
-- The current policy allows all authenticated users to view all profiles
-- We need to restrict access to sensitive fields and respect privacy settings

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a more restrictive policy that respects privacy settings
-- Users can view profiles based on privacy settings and blocking relationships
CREATE POLICY "Users can view profiles respecting privacy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Exclude profiles that have blocked the viewer
  NOT EXISTS (
    SELECT 1 FROM public.blocked_users bu 
    WHERE bu.blocker_id = profiles.user_id AND bu.blocked_id = auth.uid()
  )
  AND (
    -- Always allow viewing own profile
    user_id = auth.uid()
    -- Public profiles are viewable
    OR COALESCE((SELECT profile_visibility FROM public.privacy_settings WHERE privacy_settings.user_id = profiles.user_id), 'public') = 'public'
    -- Friends-only profiles are viewable by followers
    OR (
      COALESCE((SELECT profile_visibility FROM public.privacy_settings WHERE privacy_settings.user_id = profiles.user_id), 'public') = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.follows f 
        WHERE f.follower_id = auth.uid() AND f.following_id = profiles.user_id
      )
    )
  )
);

-- Allow anonymous users to view public profiles only
CREATE POLICY "Anonymous users can view public profiles"
ON public.profiles
FOR SELECT
TO anon
USING (
  COALESCE((SELECT profile_visibility FROM public.privacy_settings WHERE privacy_settings.user_id = profiles.user_id), 'public') = 'public'
);