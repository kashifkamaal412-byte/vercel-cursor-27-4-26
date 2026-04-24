-- Fix: Remove anonymous access to profiles table to prevent data scraping
-- Anonymous visitors should NOT be able to see ANY profile data including social media handles

-- Drop the anonymous access policy that exposes all profile data to unauthenticated users
DROP POLICY IF EXISTS "Anonymous users can view public profiles" ON public.profiles;

-- The remaining policies handle authenticated access:
-- 1. "Users can view own profile" - allows users to see their own profile
-- 2. "Users can view profiles respecting privacy" - allows authenticated users to see others' public profiles with privacy and block checks
-- These policies together provide proper access control while requiring authentication