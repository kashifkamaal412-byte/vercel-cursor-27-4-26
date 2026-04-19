
-- The delete policy already exists, just ensure it's correct
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
