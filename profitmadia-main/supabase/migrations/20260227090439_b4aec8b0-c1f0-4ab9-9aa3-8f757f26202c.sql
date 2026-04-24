
-- Drop the existing permissive INSERT policy on thumbnails bucket
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;

-- Create a new policy that enforces folder ownership
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);
