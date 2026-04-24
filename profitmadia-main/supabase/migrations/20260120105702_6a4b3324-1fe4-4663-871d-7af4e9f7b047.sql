-- Fix profiles table exposure: Create a public view with only safe fields
-- and restrict direct access to profiles table

-- Step 1: Drop existing "Public Read Access" policy for profiles
DROP POLICY IF EXISTS "Public Read Access" ON public.profiles;

-- Step 2: Create a public view that excludes sensitive financial data
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  username,
  display_name,
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
  updated_at
FROM public.profiles;
-- Note: Excludes total_earnings and total_gifts for privacy

-- Step 3: Create restrictive SELECT policy - only authenticated users can view profiles
-- This allows viewing public profile data but protects from anonymous scraping
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Step 4: Users can always view their own profile (keep existing policy)
-- The "Users can view own profile" policy already exists and handles this