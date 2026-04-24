
-- Fix: Sounds bucket INSERT policy - enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload sounds" ON storage.objects;
CREATE POLICY "Authenticated users can upload sounds" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sounds' AND (storage.foldername(name))[1] = auth.uid()::text);
