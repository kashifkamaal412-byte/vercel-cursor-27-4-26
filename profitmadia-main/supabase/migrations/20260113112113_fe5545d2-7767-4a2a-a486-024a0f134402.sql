-- Create gifts table for tracking gifts sent to videos
CREATE TABLE public.gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  video_id UUID NOT NULL,
  gift_type TEXT NOT NULL DEFAULT 'heart',
  gift_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watch_time table for tracking video watch duration
CREATE TABLE public.watch_time (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  watch_duration INTEGER NOT NULL DEFAULT 0,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audience_analytics table for demographic data
CREATE TABLE public.audience_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  viewer_id UUID,
  country TEXT,
  region TEXT,
  age_group TEXT,
  gender TEXT,
  watch_hour INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create earnings table for tracking creator earnings
CREATE TABLE public.earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  earning_type TEXT NOT NULL DEFAULT 'views',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_log table for tracking user activities
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  video_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add gift counts to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_gifts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;

-- Add gift count to videos
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS gift_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_watch_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gifts
CREATE POLICY "Gifts are viewable by everyone" ON public.gifts FOR SELECT USING (true);
CREATE POLICY "Users can send gifts" ON public.gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for watch_time
CREATE POLICY "Watch time viewable by video owner" ON public.watch_time FOR SELECT USING (true);
CREATE POLICY "Users can record watch time" ON public.watch_time FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audience_analytics
CREATE POLICY "Analytics viewable by everyone" ON public.audience_analytics FOR SELECT USING (true);
CREATE POLICY "System can insert analytics" ON public.audience_analytics FOR INSERT WITH CHECK (true);

-- RLS Policies for earnings
CREATE POLICY "Users can view own earnings" ON public.earnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert earnings" ON public.earnings FOR INSERT WITH CHECK (true);

-- RLS Policies for activity_log
CREATE POLICY "Users can view activities about them" ON public.activity_log FOR SELECT USING (auth.uid() = target_user_id);
CREATE POLICY "Users can log activities" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger function for gift counts
CREATE OR REPLACE FUNCTION public.update_gift_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET gift_count = COALESCE(gift_count, 0) + NEW.gift_value WHERE id = NEW.video_id;
    UPDATE public.profiles SET total_gifts = COALESCE(total_gifts, 0) + NEW.gift_value WHERE user_id = NEW.receiver_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Create trigger for gift counts
CREATE TRIGGER on_gift_inserted
AFTER INSERT ON public.gifts
FOR EACH ROW
EXECUTE FUNCTION public.update_gift_counts();

-- Create trigger function for watch time aggregation
CREATE OR REPLACE FUNCTION public.update_video_watch_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET total_watch_time = COALESCE(total_watch_time, 0) + NEW.watch_duration WHERE id = NEW.video_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Create trigger for watch time
CREATE TRIGGER on_watch_time_inserted
AFTER INSERT ON public.watch_time
FOR EACH ROW
EXECUTE FUNCTION public.update_video_watch_time();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_time;
ALTER PUBLICATION supabase_realtime ADD TABLE public.earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;