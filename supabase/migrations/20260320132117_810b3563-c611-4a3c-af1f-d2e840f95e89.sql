CREATE POLICY "Users can view own warnings"
ON public.user_warnings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());