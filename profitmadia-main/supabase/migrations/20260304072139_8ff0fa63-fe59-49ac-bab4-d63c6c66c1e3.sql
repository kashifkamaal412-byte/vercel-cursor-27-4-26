-- Drop and recreate to ensure correct folder-scoped policies
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own thumbnails" ON storage.objects;

CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);