
-- All functions first
CREATE OR REPLACE FUNCTION public.handle_new_user_privacy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.privacy_settings (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_video_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET like_count = like_count - 1 WHERE id = OLD.video_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_video_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET comment_count = comment_count - 1 WHERE id = OLD.video_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_video_save_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET save_count = save_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET save_count = save_count - 1 WHERE id = OLD.video_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET total_followers = total_followers + 1 WHERE user_id = NEW.following_id;
    UPDATE public.profiles SET total_following = total_following + 1 WHERE user_id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET total_followers = total_followers - 1 WHERE user_id = OLD.following_id;
    UPDATE public.profiles SET total_following = total_following - 1 WHERE user_id = OLD.follower_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_gift_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET gift_count = COALESCE(gift_count, 0) + NEW.gift_value WHERE id = NEW.video_id;
    UPDATE public.profiles SET total_gifts = COALESCE(total_gifts, 0) + NEW.gift_value WHERE user_id = NEW.receiver_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_video_watch_time()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET total_watch_time = COALESCE(total_watch_time, 0) + NEW.watch_duration WHERE id = NEW.video_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_total_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;
    UPDATE public.profiles SET total_likes = COALESCE(total_likes, 0) + 1 WHERE user_id = video_owner_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO video_owner_id FROM public.videos WHERE id = OLD.video_id;
    UPDATE public.profiles SET total_likes = GREATEST(COALESCE(total_likes, 0) - 1, 0) WHERE user_id = video_owner_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner_id uuid; liker_name text; video_caption text;
BEGIN
  SELECT user_id, caption INTO video_owner_id, video_caption FROM public.videos WHERE id = NEW.video_id;
  IF video_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (video_owner_id, NEW.user_id, NEW.video_id, 'like', liker_name || ' liked your video', jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled')));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner_id uuid; commenter_name text; video_caption text;
BEGIN
  SELECT user_id, caption INTO video_owner_id, video_caption FROM public.videos WHERE id = NEW.video_id;
  IF video_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (video_owner_id, NEW.user_id, NEW.video_id, 'comment', commenter_name || ' commented on your video', jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'), 'comment', LEFT(NEW.content, 100)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name text;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO follower_name FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, from_user_id, type, message) VALUES (NEW.following_id, NEW.follower_id, 'follow', follower_name || ' started following you');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_gift_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text; video_caption text;
BEGIN
  IF NEW.receiver_id = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT caption INTO video_caption FROM public.videos WHERE id = NEW.video_id;
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (NEW.receiver_id, NEW.sender_id, NEW.video_id, 'gift', sender_name || ' sent you a ' || NEW.gift_type || ' gift!', jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'), 'gift_type', NEW.gift_type, 'gift_value', NEW.gift_value));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE conversations SET last_message_id = NEW.id, last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.comments SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.comments SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.comment_id;
  END IF; RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one uuid, user_two uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id UUID; p1 UUID; p2 UUID;
BEGIN
  IF auth.uid() != user_one AND auth.uid() != user_two THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF user_one < user_two THEN p1 := user_one; p2 := user_two; ELSE p1 := user_two; p2 := user_one; END IF;
  SELECT id INTO conv_id FROM conversations WHERE participant_one = p1 AND participant_two = p2;
  IF conv_id IS NULL THEN INSERT INTO conversations (participant_one, participant_two, initiated_by) VALUES (p1, p2, auth.uid()) RETURNING id INTO conv_id; END IF;
  RETURN conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.view_tracking WHERE user_id = current_user_id AND view_tracking.video_id = increment_view_count.video_id) THEN RETURN false; END IF;
  INSERT INTO public.view_tracking (user_id, video_id) VALUES (current_user_id, increment_view_count.video_id) ON CONFLICT DO NOTHING;
  UPDATE public.videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = increment_view_count.video_id;
  UPDATE public.profiles SET total_views = COALESCE(total_views, 0) + 1 WHERE user_id = (SELECT user_id FROM public.videos WHERE id = increment_view_count.video_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action_type text, _max_actions integer, _window_minutes integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_count integer; window_time timestamptz;
BEGIN
  SELECT action_count, window_start INTO current_count, window_time FROM rate_limits WHERE user_id = _user_id AND action_type = _action_type;
  IF current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start) VALUES (_user_id, _action_type, 1, now()) ON CONFLICT (user_id, action_type) DO UPDATE SET action_count = 1, window_start = now();
    RETURN true;
  END IF;
  IF now() - window_time > (_window_minutes || ' minutes')::interval THEN
    UPDATE rate_limits SET action_count = 1, window_start = now() WHERE user_id = _user_id AND action_type = _action_type;
    RETURN true;
  END IF;
  IF current_count >= _max_actions THEN RETURN false; END IF;
  UPDATE rate_limits SET action_count = action_count + 1 WHERE user_id = _user_id AND action_type = _action_type;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Now all triggers
DROP TRIGGER IF EXISTS on_profile_created_privacy ON public.profiles;
CREATE TRIGGER on_profile_created_privacy AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_privacy();

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.update_video_like_count();

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_video_comment_count();

DROP TRIGGER IF EXISTS on_save_change ON public.saves;
CREATE TRIGGER on_save_change AFTER INSERT OR DELETE ON public.saves FOR EACH ROW EXECUTE FUNCTION public.update_video_save_count();

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

DROP TRIGGER IF EXISTS on_gift_sent ON public.gifts;
CREATE TRIGGER on_gift_sent AFTER INSERT ON public.gifts FOR EACH ROW EXECUTE FUNCTION public.update_gift_counts();

DROP TRIGGER IF EXISTS on_watch_time_recorded ON public.watch_time;
CREATE TRIGGER on_watch_time_recorded AFTER INSERT ON public.watch_time FOR EACH ROW EXECUTE FUNCTION public.update_video_watch_time();

DROP TRIGGER IF EXISTS on_like_change_profile ON public.likes;
CREATE TRIGGER on_like_change_profile AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.update_profile_total_likes();

DROP TRIGGER IF EXISTS on_like_notify ON public.likes;
CREATE TRIGGER on_like_notify AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.create_like_notification();

DROP TRIGGER IF EXISTS on_comment_notify ON public.comments;
CREATE TRIGGER on_comment_notify AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.create_comment_notification();

DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();

DROP TRIGGER IF EXISTS on_gift_notify ON public.gifts;
CREATE TRIGGER on_gift_notify AFTER INSERT ON public.gifts FOR EACH ROW EXECUTE FUNCTION public.create_gift_notification();

DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

DROP TRIGGER IF EXISTS on_comment_like_change ON public.comment_likes;
CREATE TRIGGER on_comment_like_change AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.update_comment_like_count();
