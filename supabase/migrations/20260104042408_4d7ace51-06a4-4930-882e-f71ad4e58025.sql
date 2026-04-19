-- Add status column to videos table
ALTER TABLE public.videos 
ADD COLUMN status text NOT NULL DEFAULT 'processing'
CHECK (status IN ('processing', 'ready', 'failed'));

-- Create index for faster status filtering
CREATE INDEX idx_videos_status ON public.videos(status);