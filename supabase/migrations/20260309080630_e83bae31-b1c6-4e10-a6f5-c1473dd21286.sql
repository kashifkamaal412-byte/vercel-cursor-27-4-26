
-- 1. Fix follows: Drop the unconditional 'Anyone can view follows' policy
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;

-- 2. Fix likes: Drop the unconditional 'Users can view likes' policy (USING true)
DROP POLICY IF EXISTS "Users can view likes" ON public.likes;

-- 3. Fix messages: Add WITH CHECK to sender update policy to prevent rerouting
DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id AND receiver_id = receiver_id AND conversation_id = conversation_id);

-- 4. Fix profiles: Drop broad authenticated policy, replace with privacy-respecting one
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
