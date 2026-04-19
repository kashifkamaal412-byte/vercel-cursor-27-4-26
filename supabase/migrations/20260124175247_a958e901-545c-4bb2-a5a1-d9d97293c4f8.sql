-- Fix increment_view_count function to require authentication
-- This prevents anonymous users from inflating view counts

CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  is_video_public boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Require authentication for view counting (prevents anonymous inflation)
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify video exists and is public
  SELECT is_public INTO is_video_public 
  FROM public.videos 
  WHERE id = increment_view_count.video_id;
  
  IF is_video_public IS NULL OR is_video_public = false THEN
    RETURN false;
  END IF;
  
  -- Check if already viewed (rate limiting - one view per user per video)
  IF EXISTS (
    SELECT 1 FROM public.view_tracking 
    WHERE user_id = current_user_id AND view_tracking.video_id = increment_view_count.video_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Record view and increment counts
  INSERT INTO public.view_tracking (user_id, video_id)
  VALUES (current_user_id, increment_view_count.video_id)
  ON CONFLICT DO NOTHING;
  
  UPDATE public.videos 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = increment_view_count.video_id;
  
  UPDATE public.profiles
  SET total_views = COALESCE(total_views, 0) + 1
  WHERE user_id = (SELECT user_id FROM public.videos WHERE id = increment_view_count.video_id);
  
  RETURN true;
END;
$$;