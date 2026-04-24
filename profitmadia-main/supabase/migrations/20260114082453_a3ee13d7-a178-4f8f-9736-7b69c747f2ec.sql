-- Drop the old function first to change return type
DROP FUNCTION IF EXISTS public.increment_view_count(uuid);

-- Recreate the function with rate limiting and boolean return
CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Allow anonymous views but don't track them for rate limiting
  IF current_user_id IS NULL THEN
    UPDATE public.videos 
    SET view_count = COALESCE(view_count, 0) + 1 
    WHERE id = increment_view_count.video_id;
    
    UPDATE public.profiles
    SET total_views = COALESCE(total_views, 0) + 1
    WHERE user_id = (SELECT user_id FROM public.videos WHERE id = increment_view_count.video_id);
    
    RETURN true;
  END IF;
  
  -- Check if authenticated user already viewed this video
  IF EXISTS (
    SELECT 1 FROM public.view_tracking 
    WHERE user_id = current_user_id AND view_tracking.video_id = increment_view_count.video_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Record the view for rate limiting
  INSERT INTO public.view_tracking (user_id, video_id)
  VALUES (current_user_id, increment_view_count.video_id)
  ON CONFLICT DO NOTHING;
  
  -- Increment counts
  UPDATE public.videos 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = increment_view_count.video_id;
  
  UPDATE public.profiles
  SET total_views = COALESCE(total_views, 0) + 1
  WHERE user_id = (SELECT user_id FROM public.videos WHERE id = increment_view_count.video_id);
  
  RETURN true;
END;
$$;

-- Fix audience_analytics: Restrict to video owner only
DROP POLICY IF EXISTS "Analytics viewable by everyone" ON public.audience_analytics;

CREATE POLICY "Analytics viewable by video owner" ON public.audience_analytics
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.videos WHERE id = audience_analytics.video_id)
);

-- Fix watch_time: Restrict to video owner only
DROP POLICY IF EXISTS "Watch time viewable by video owner" ON public.watch_time;

CREATE POLICY "Watch time viewable by video owner" ON public.watch_time
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.videos WHERE id = watch_time.video_id)
);

-- Fix activity_log: Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Users can view activities about them" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activity_log;

CREATE POLICY "Users can view their activity logs"
ON public.activity_log FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = target_user_id);