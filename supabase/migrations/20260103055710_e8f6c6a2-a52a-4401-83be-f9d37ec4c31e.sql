-- Add video_type column to videos table
ALTER TABLE public.videos 
ADD COLUMN video_type TEXT DEFAULT 'short' CHECK (video_type IN ('short', 'long', 'live'));

-- Update existing videos to be 'short' by default
UPDATE public.videos SET video_type = 'short' WHERE video_type IS NULL;

-- Create index for faster filtering
CREATE INDEX idx_videos_video_type ON public.videos(video_type);