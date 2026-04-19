-- Make the videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'videos';

-- Add RLS policy: authenticated users can read video files
CREATE POLICY "Authenticated users can read videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- Add RLS policy: users can upload to their own folder in videos
CREATE POLICY "Users can upload to own folder in videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add RLS policy: users can delete their own video files
CREATE POLICY "Users can delete own videos from storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);