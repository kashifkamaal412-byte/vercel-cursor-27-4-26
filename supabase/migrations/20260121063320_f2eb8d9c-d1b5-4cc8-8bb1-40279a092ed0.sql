-- Fix viewer_id exposure: Remove direct SELECT access to audience_analytics
-- Force all access through the get_anonymized_analytics() function

-- Drop the existing policy that allows direct access with viewer_id visible
DROP POLICY IF EXISTS "Analytics viewable by video owner without viewer_id" ON public.audience_analytics;

-- Create a new restrictive policy - video owners can only access via the anonymization function
-- We completely deny direct SELECT access, forcing use of get_anonymized_analytics()
-- The function has SECURITY DEFINER removed so it runs with invoker's permissions
-- but the function itself controls what columns are returned (excludes viewer_id)

-- Alternative: Allow SELECT but use a view or RLS that masks viewer_id
-- For maximum privacy, we'll deny direct table access entirely for SELECT
-- The INSERT policy remains for users recording their own analytics

-- No SELECT policy = no direct read access to the table
-- Users must call get_anonymized_analytics(video_id) which returns data without viewer_id