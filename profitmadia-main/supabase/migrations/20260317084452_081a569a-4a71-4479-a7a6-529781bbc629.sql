
-- Fix 1: live_chat SELECT policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.live_chat;
CREATE POLICY "Authenticated users can view chat messages"
  ON public.live_chat FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: public_profile_view - recreate as SECURITY INVOKER so it inherits profiles RLS
DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view
WITH (security_invoker = true)
AS SELECT
  id, user_id, display_name, username, bio, avatar_url, cover_url,
  website, instagram, twitter, youtube, tiktok, activity_status,
  creator_score, trust_level, total_views, total_likes,
  total_followers, total_following, created_at, updated_at,
  0 AS total_gifts, 0.00::numeric AS total_earnings
FROM public.profiles;

-- Fix 3: profiles - add authentication requirement to the privacy-respecting SELECT policy
-- The current policy allows anon users to read public profiles (including total_earnings)
-- Replace with authenticated-only version
DROP POLICY IF EXISTS "Users can view profiles respecting privacy" ON public.profiles;
CREATE POLICY "Users can view profiles respecting privacy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE bu.blocker_id = profiles.user_id AND bu.blocked_id = auth.uid()
    ))
    AND (
      user_id = auth.uid()
      OR COALESCE(
        (SELECT ps.profile_visibility FROM privacy_settings ps WHERE ps.user_id = profiles.user_id),
        'public'
      ) = 'public'
      OR (
        COALESCE(
          (SELECT ps.profile_visibility FROM privacy_settings ps WHERE ps.user_id = profiles.user_id),
          'public'
        ) = 'friends'
        AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = profiles.user_id
        )
      )
    )
  );
