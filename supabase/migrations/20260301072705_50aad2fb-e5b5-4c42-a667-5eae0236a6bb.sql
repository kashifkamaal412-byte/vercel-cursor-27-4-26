-- Drop the direct SELECT policy that exposes viewer_id
DROP POLICY IF EXISTS "Video owners can view own analytics" ON public.audience_analytics;