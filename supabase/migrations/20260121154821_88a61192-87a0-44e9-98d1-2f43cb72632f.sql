-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Triggers run as SECURITY DEFINER so they bypass RLS
-- No INSERT policy needed for regular users since only triggers create notifications