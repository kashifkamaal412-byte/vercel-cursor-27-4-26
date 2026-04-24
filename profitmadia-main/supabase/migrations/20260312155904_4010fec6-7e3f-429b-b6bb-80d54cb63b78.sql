DROP POLICY IF EXISTS "Anyone can view live gifts" ON public.live_gifts;
CREATE POLICY "Authenticated users can view live gifts"
  ON public.live_gifts FOR SELECT
  TO authenticated
  USING (true);