-- Create the missing view_tracking table for authenticated user view rate limiting
CREATE TABLE public.view_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.view_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tracking records
CREATE POLICY "Users can view own view tracking"
ON public.view_tracking FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own tracking records
CREATE POLICY "Authenticated users can track views"
ON public.view_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_view_tracking_user_video ON public.view_tracking(user_id, video_id);
CREATE INDEX idx_view_tracking_video ON public.view_tracking(video_id);