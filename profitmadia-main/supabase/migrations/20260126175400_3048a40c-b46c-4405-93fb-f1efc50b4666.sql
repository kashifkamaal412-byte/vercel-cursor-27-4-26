-- Enhanced increment_view_count with built-in rate limiting
-- This reduces abuse potential by limiting how often a user can trigger view counts

CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_video_public boolean;
  recent_view_count integer;
BEGIN
  current_user_id := auth.uid();
  
  -- Require authentication for view counting (prevents anonymous inflation)
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Server-side rate limiting: max 60 view counts per minute per user
  -- This prevents abuse even if the user has multiple videos to view
  SELECT COUNT(*) INTO recent_view_count
  FROM public.view_tracking
  WHERE user_id = current_user_id
    AND created_at > now() - interval '1 minute';
  
  IF recent_view_count >= 60 THEN
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