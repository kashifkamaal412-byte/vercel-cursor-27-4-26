
-- Restrict live_chat SELECT to stream participants (creator, active viewers, or guests)
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.live_chat;
DROP POLICY IF EXISTS "Authenticated can view chat" ON public.live_chat;

CREATE POLICY "Users can view chat in their streams"
ON public.live_chat
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.live_streams WHERE id = live_chat.stream_id AND creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.live_viewers WHERE stream_id = live_chat.stream_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM public.live_guests WHERE stream_id = live_chat.stream_id AND user_id = auth.uid() AND status IN ('accepted', 'joined'))
);
