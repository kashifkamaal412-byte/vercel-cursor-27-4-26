-- Fix overly permissive RLS policies for audience_analytics and earnings

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert analytics" ON public.audience_analytics;
DROP POLICY IF EXISTS "System can insert earnings" ON public.earnings;

-- Create proper RLS policies for audience_analytics
CREATE POLICY "Authenticated users can insert analytics" ON public.audience_analytics 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create proper RLS policies for earnings (only video owners can insert)
CREATE POLICY "Authenticated users can insert own earnings" ON public.earnings 
FOR INSERT WITH CHECK (auth.uid() = user_id);