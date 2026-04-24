-- Fix INFO_LEAKAGE: Remove direct SELECT policy on audience_analytics
-- Force all access through get_anonymized_analytics() function which excludes viewer_id

-- Drop the permissive SELECT policy that exposes viewer_id
DROP POLICY IF EXISTS "Video owners can view analytics for their videos" ON public.audience_analytics;

-- NOTE: The get_anonymized_analytics() function already exists and excludes viewer_id
-- All client code should use this RPC function instead of direct table access