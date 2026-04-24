-- Fix activity_log: Restrict SELECT to only the actor (user_id), not the target
-- This prevents exposure of sensitive metadata to target users

DROP POLICY IF EXISTS "Users can view their activity logs" ON public.activity_log;

CREATE POLICY "Users can view their own activities only" 
ON public.activity_log 
FOR SELECT 
USING (auth.uid() = user_id);