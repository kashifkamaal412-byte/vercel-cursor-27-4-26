-- Fix 1: Drop overly permissive INSERT policy on audience_analytics
DROP POLICY IF EXISTS "System can insert analytics" ON public.audience_analytics;

-- Fix 2: Fix messages UPDATE policy - restrict to sender only, add separate receiver mark-as-read
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Senders can update own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);