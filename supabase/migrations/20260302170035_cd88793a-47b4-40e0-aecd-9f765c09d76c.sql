-- Allow users to check their own role, admins can view all
DROP POLICY IF EXISTS "Only admins can view roles" ON public.user_roles;

CREATE POLICY "Users can view own role or admins can view all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));