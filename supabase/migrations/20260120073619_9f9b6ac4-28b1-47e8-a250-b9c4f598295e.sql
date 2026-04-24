-- Fix: Follows table exposes complete social graph regardless of privacy settings
-- This migration updates the RLS policy to respect show_fans_list and show_following_list settings

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.follows;

-- Create a new policy that respects privacy settings
-- Users can always see their own follow relationships
-- Other users can only see relationships if both parties allow it via privacy settings
CREATE POLICY "Follows viewable based on privacy settings"
ON public.follows FOR SELECT TO authenticated
USING (
  -- Always allow users to see their own relationships
  auth.uid() = follower_id 
  OR auth.uid() = following_id
  OR
  (
    -- Check if the follower allows their following list to be shown
    COALESCE(
      (SELECT show_following_list FROM privacy_settings WHERE user_id = follows.follower_id), 
      true
    ) = true
    AND
    -- Check if the user being followed allows their fans list to be shown
    COALESCE(
      (SELECT show_fans_list FROM privacy_settings WHERE user_id = follows.following_id), 
      true
    ) = true
  )
);