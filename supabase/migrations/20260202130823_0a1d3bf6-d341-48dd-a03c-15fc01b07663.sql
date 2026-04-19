-- The profile policy was already applied successfully in the previous migration
-- Now we need to create a secure view for profiles that hides financial data from non-owners
-- This adds defense-in-depth for the financial data exposure concern

-- Create a secure view that masks financial data for non-owners
DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  display_name,
  username,
  bio,
  avatar_url,
  cover_url,
  website,
  instagram,
  twitter,
  youtube,
  tiktok,
  activity_status,
  creator_score,
  trust_level,
  total_views,
  total_likes,
  total_followers,
  total_following,
  created_at,
  updated_at,
  -- Only show financial data to the profile owner
  CASE 
    WHEN auth.uid() = user_id THEN total_gifts 
    ELSE NULL 
  END as total_gifts,
  CASE 
    WHEN auth.uid() = user_id THEN total_earnings 
    ELSE NULL 
  END as total_earnings
FROM public.profiles;