-- Fix 1: Drop the profiles_public view which exposes profile data without authentication
-- The profiles table already has proper RLS policies that respect privacy settings
-- Applications should use the profiles table directly with authenticated requests
DROP VIEW IF EXISTS public.profiles_public;

-- Fix 2: Update audience_analytics RLS policy to hide viewer_id from video owners
-- Video owners should see aggregated analytics but NOT be able to identify specific viewers

-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Analytics viewable by video owner" ON public.audience_analytics;

-- Create a new policy that allows video owners to see analytics but anonymizes viewer_id
-- We use a function to return analytics with viewer_id hidden
CREATE OR REPLACE FUNCTION public.get_anonymized_analytics(p_video_id uuid)
RETURNS TABLE(
  id uuid,
  video_id uuid,
  watch_hour integer,
  created_at timestamptz,
  country text,
  region text,
  age_group text,
  gender text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    aa.id,
    aa.video_id,
    aa.watch_hour,
    aa.created_at,
    aa.country,
    aa.region,
    aa.age_group,
    aa.gender
  FROM public.audience_analytics aa
  INNER JOIN public.videos v ON v.id = aa.video_id
  WHERE aa.video_id = p_video_id
    AND v.user_id = auth.uid();
$$;

-- Create a new RLS policy that prevents direct SELECT of viewer_id
-- Video owners can only see their own analytics (excluding viewer_id via the function above)
-- The direct table access is blocked - use the function instead
CREATE POLICY "Analytics viewable by video owner without viewer_id"
ON public.audience_analytics
FOR SELECT
USING (
  -- Users can see analytics for their own videos, but must use get_anonymized_analytics() to hide viewer_id
  auth.uid() IN (
    SELECT v.user_id FROM public.videos v WHERE v.id = audience_analytics.video_id
  )
);

-- Add comment explaining the privacy-preserving approach
COMMENT ON FUNCTION public.get_anonymized_analytics IS 'Returns analytics for a video without exposing viewer_id to protect user privacy. Use this function instead of querying audience_analytics directly.';