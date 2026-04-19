-- Secure gifts: Only sender and receiver can see gift transactions
DROP POLICY IF EXISTS "Gifts are viewable by everyone" ON public.gifts;

CREATE POLICY "Gifts viewable by participants" ON public.gifts
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Also allow video owners to see gifts on their videos (for creator dashboard)
CREATE POLICY "Video owners can see gifts on their videos" ON public.gifts
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.videos WHERE id = gifts.video_id)
);