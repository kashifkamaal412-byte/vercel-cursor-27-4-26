
-- Fix thumbnails bucket: drop existing and recreate with folder ownership
DROP POLICY IF EXISTS "Users can upload own thumbnails" ON storage.objects;
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
