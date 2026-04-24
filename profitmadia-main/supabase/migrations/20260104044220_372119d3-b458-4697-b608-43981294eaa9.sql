-- Create function to safely increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = video_id;
  
  -- Also update the creator's total_views in profiles
  UPDATE public.profiles
  SET total_views = COALESCE(total_views, 0) + 1
  WHERE user_id = (SELECT user_id FROM public.videos WHERE id = video_id);
END;
$$;

-- Create function to update total_likes when likes change
CREATE OR REPLACE FUNCTION public.update_profile_total_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_owner_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;
    UPDATE public.profiles SET total_likes = COALESCE(total_likes, 0) + 1 WHERE user_id = video_owner_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO video_owner_id FROM public.videos WHERE id = OLD.video_id;
    UPDATE public.profiles SET total_likes = GREATEST(COALESCE(total_likes, 0) - 1, 0) WHERE user_id = video_owner_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for profile likes updates
DROP TRIGGER IF EXISTS update_profile_likes_trigger ON public.likes;
CREATE TRIGGER update_profile_likes_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_total_likes();

-- Enable realtime for profiles table to get instant stat updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;