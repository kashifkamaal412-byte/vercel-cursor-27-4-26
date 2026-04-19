-- Create storage buckets for avatars and covers
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Avatars storage policies
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Covers storage policies
CREATE POLICY "Covers are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Users can upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own covers" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own covers" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add input validation constraints for comments
ALTER TABLE public.comments ADD CONSTRAINT comments_content_length CHECK (char_length(content) > 0 AND char_length(content) <= 2000);

-- Add input validation constraints for videos
ALTER TABLE public.videos ADD CONSTRAINT videos_caption_length CHECK (caption IS NULL OR char_length(caption) <= 500);
ALTER TABLE public.videos ADD CONSTRAINT videos_tags_limit CHECK (tags IS NULL OR array_length(tags, 1) <= 10);

-- Add input validation constraints for profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 100);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_length CHECK (username IS NULL OR char_length(username) <= 50);

-- Add URL format validation for social media (allowing null or valid URLs)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_instagram_format CHECK (instagram IS NULL OR instagram ~ '^https?://');
ALTER TABLE public.profiles ADD CONSTRAINT profiles_twitter_format CHECK (twitter IS NULL OR twitter ~ '^https?://');
ALTER TABLE public.profiles ADD CONSTRAINT profiles_youtube_format CHECK (youtube IS NULL OR youtube ~ '^https?://');
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tiktok_format CHECK (tiktok IS NULL OR tiktok ~ '^https?://');
ALTER TABLE public.profiles ADD CONSTRAINT profiles_website_format CHECK (website IS NULL OR website ~ '^https?://');

-- Add RLS policy for activity_log so users can see their own activities
CREATE POLICY "Users can view their own activities"
ON public.activity_log FOR SELECT
USING (auth.uid() = user_id);