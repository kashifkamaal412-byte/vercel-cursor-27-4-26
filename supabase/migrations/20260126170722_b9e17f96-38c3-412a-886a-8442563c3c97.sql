-- Fix the permissive RLS policy warning on rate_limits table
-- The "System can manage rate limits" policy needs to be scoped to SECURITY DEFINER functions only

DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Instead, we'll rely on the SECURITY DEFINER functions to bypass RLS
-- This is secure because the check_rate_limit function runs with elevated privileges
-- and users can only trigger it through INSERT operations on other tables

-- Grant INSERT and UPDATE to authenticated users through the SECURITY DEFINER function
-- The rate_limits table modifications happen inside SECURITY DEFINER functions
-- so we don't need an additional RLS policy for INSERT/UPDATE/DELETE

-- Users can only view their own rate limits (already exists)
-- The actual modifications happen via SECURITY DEFINER triggers