DROP POLICY IF EXISTS "Anyone can view active viewers" ON public.live_viewers;

CREATE POLICY "Authenticated users can view relevant viewers"
ON public.live_viewers
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.live_streams
    WHERE live_streams.id = live_viewers.stream_id
    AND live_streams.creator_id = auth.uid()
  )
);