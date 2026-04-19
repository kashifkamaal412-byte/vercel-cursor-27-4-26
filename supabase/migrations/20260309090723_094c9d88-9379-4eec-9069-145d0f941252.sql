
-- 1. Fix messages tautological update check
DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 2. Fix notifications null user_id exposure
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- 3. Fix thumbnails bucket: enforce folder ownership on uploads  
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own thumbnails" ON storage.objects;
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
