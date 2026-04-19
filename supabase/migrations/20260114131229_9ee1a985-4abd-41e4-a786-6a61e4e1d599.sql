-- 1. Fix increment_view_count function - require auth and verify video is public
CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Check if already viewed
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

-- 2. Update profiles RLS - require authentication for viewing
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Update comments RLS - require authentication for viewing
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);

-- 4. Update follows RLS - require authentication for viewing
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;

CREATE POLICY "Authenticated users can view follows"
ON public.follows
FOR SELECT
TO authenticated
USING (true);

-- 5. Update likes RLS - require authentication for viewing
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

CREATE POLICY "Authenticated users can view likes"
ON public.likes
FOR SELECT
TO authenticated
USING (true);