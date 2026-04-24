
-- Fix 1: Restrict user_warnings SELECT to only authenticated users (own warnings or admin)
-- The existing "Users can view own warnings" policy already handles authenticated users viewing their own.
-- The "Admins can manage warnings" ALL policy handles admin access.
-- We need to ensure anon role cannot read. Add a restrictive default-deny for anon.
-- Actually, the ALL policy with has_role check already restricts non-admins. 
-- But the "Users can view own warnings" is for 'authenticated' role, so anon can't use it.
-- The ALL policy is for 'public' role (includes anon), but requires has_role which anon won't pass.
-- So actually anon CAN'T read. But let's tighten by revoking anon access explicitly.

-- Revoke direct table access from anon role for user_warnings
-- Actually, RLS is enabled so policies control access. The ALL policy uses has_role which requires auth.uid().
-- For anon users, auth.uid() is NULL, so has_role returns false. This should be safe.
-- But to be extra safe, let's change the ALL policy to only apply to authenticated role.

DROP POLICY IF EXISTS "Admins can manage warnings" ON public.user_warnings;
CREATE POLICY "Admins can manage warnings" ON public.user_warnings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add proper INSERT/UPDATE/DELETE policies for rate_limits
-- The check_rate_limit function is SECURITY DEFINER so it bypasses RLS.
-- We should block direct table manipulation by regular users.
-- No one should directly INSERT/UPDATE/DELETE - only the security definer function should.

CREATE POLICY "No direct insert on rate_limits" ON public.rate_limits
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct update on rate_limits" ON public.rate_limits
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "No direct delete on rate_limits" ON public.rate_limits
  FOR DELETE TO authenticated
  USING (false);
