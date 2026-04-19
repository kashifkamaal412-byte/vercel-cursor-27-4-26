
-- Add location, description, external_link, and age_restriction columns to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS external_link text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS age_restriction text DEFAULT 'everyone';

-- Create a thumbnails bucket for custom thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for thumbnails bucket
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
