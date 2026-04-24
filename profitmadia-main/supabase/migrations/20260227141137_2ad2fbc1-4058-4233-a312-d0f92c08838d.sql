
-- Drop overly permissive INSERT policy on notifications
-- Notifications are created by SECURITY DEFINER triggers, no client INSERT needed
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Drop overly permissive INSERT policy on earnings
-- Earnings should only be created server-side (edge functions/triggers)
DROP POLICY IF EXISTS "Authenticated users can insert own earnings" ON public.earnings;

-- Drop overly permissive INSERT policy on audience_analytics  
-- Analytics should only be inserted server-side
DROP POLICY IF EXISTS "Users can only insert their own analytics" ON public.audience_analytics;
