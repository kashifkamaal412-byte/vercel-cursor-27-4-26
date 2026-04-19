-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  video_id UUID,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'gift', 'follow')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function for like notifications
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_owner_id uuid;
  liker_name text;
  video_caption text;
BEGIN
  -- Get video owner
  SELECT user_id, caption INTO video_owner_id, video_caption
  FROM public.videos WHERE id = NEW.video_id;
  
  -- Don't notify if user liked their own video
  IF video_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, username, 'Someone') INTO liker_name
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (
    video_owner_id,
    NEW.user_id,
    NEW.video_id,
    'like',
    liker_name || ' liked your video',
    jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'))
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for comment notifications
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_owner_id uuid;
  commenter_name text;
  video_caption text;
BEGIN
  -- Get video owner
  SELECT user_id, caption INTO video_owner_id, video_caption
  FROM public.videos WHERE id = NEW.video_id;
  
  -- Don't notify if user commented on their own video
  IF video_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter's name
  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (
    video_owner_id,
    NEW.user_id,
    NEW.video_id,
    'comment',
    commenter_name || ' commented on your video',
    jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'), 'comment', LEFT(NEW.content, 100))
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for gift notifications
CREATE OR REPLACE FUNCTION public.create_gift_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
  video_caption text;
BEGIN
  -- Don't notify if user gifted themselves
  IF NEW.receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  
  -- Get sender's name
  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;
  
  -- Get video caption
  SELECT caption INTO video_caption
  FROM public.videos WHERE id = NEW.video_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    NEW.video_id,
    'gift',
    sender_name || ' sent you a ' || NEW.gift_type || ' gift!',
    jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'), 'gift_type', NEW.gift_type, 'gift_value', NEW.gift_value)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for follow notifications
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
BEGIN
  -- Get follower's name
  SELECT COALESCE(display_name, username, 'Someone') INTO follower_name
  FROM public.profiles WHERE user_id = NEW.follower_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, from_user_id, type, message)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    follower_name || ' started following you'
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_like_create_notification
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.create_like_notification();

CREATE TRIGGER on_comment_create_notification
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.create_comment_notification();

CREATE TRIGGER on_gift_create_notification
AFTER INSERT ON public.gifts
FOR EACH ROW EXECUTE FUNCTION public.create_gift_notification();

CREATE TRIGGER on_follow_create_notification
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();