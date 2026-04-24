-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- =====================
-- updated_at trigger function
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON public.drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_updated_at BEFORE UPDATE ON public.privacy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sound_library_updated_at BEFORE UPDATE ON public.sound_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_live_streams_updated_at BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- Auto-create profile on signup
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create privacy settings
CREATE OR REPLACE FUNCTION public.handle_new_user_privacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.privacy_settings (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_profile_created_privacy
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_privacy();

-- =====================
-- has_role function
-- =====================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================
-- Rate limit function
-- =====================
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action_type text, _max_actions integer, _window_minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_count integer; window_time timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _max_actions < 1 OR _max_actions > 1000 THEN RAISE EXCEPTION 'Invalid _max_actions'; END IF;
  IF _window_minutes < 1 OR _window_minutes > 1440 THEN RAISE EXCEPTION 'Invalid _window_minutes'; END IF;

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

-- =====================
-- get_or_create_conversation
-- =====================
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one uuid, user_two uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE conv_id UUID; p1 UUID; p2 UUID;
BEGIN
  IF auth.uid() != user_one AND auth.uid() != user_two THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF user_one < user_two THEN p1 := user_one; p2 := user_two; ELSE p1 := user_two; p2 := user_one; END IF;
  SELECT id INTO conv_id FROM conversations WHERE participant_one = p1 AND participant_two = p2;
  IF conv_id IS NULL THEN INSERT INTO conversations (participant_one, participant_two, initiated_by) VALUES (p1, p2, auth.uid()) RETURNING id INTO conv_id; END IF;
  RETURN conv_id;
END;
$$;

-- =====================
-- increment_view_count
-- =====================
CREATE OR REPLACE FUNCTION public.increment_view_count(video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- =====================
-- Count triggers
-- =====================
CREATE OR REPLACE FUNCTION public.update_video_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET like_count = like_count - 1 WHERE id = OLD.video_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_video_like_count AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION update_video_like_count();

CREATE OR REPLACE FUNCTION public.update_video_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET comment_count = comment_count - 1 WHERE id = OLD.video_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_video_comment_count AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_video_comment_count();

CREATE OR REPLACE FUNCTION public.update_video_save_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET save_count = save_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET save_count = save_count - 1 WHERE id = OLD.video_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_video_save_count AFTER INSERT OR DELETE ON public.saves FOR EACH ROW EXECUTE FUNCTION update_video_save_count();

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET total_followers = total_followers + 1 WHERE user_id = NEW.following_id;
    UPDATE public.profiles SET total_following = total_following + 1 WHERE user_id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET total_followers = total_followers - 1 WHERE user_id = OLD.following_id;
    UPDATE public.profiles SET total_following = total_following - 1 WHERE user_id = OLD.follower_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_follow_counts AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

CREATE OR REPLACE FUNCTION public.update_profile_total_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;
    UPDATE public.profiles SET total_likes = COALESCE(total_likes, 0) + 1 WHERE user_id = video_owner_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO video_owner_id FROM public.videos WHERE id = OLD.video_id;
    UPDATE public.profiles SET total_likes = GREATEST(COALESCE(total_likes, 0) - 1, 0) WHERE user_id = video_owner_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_profile_total_likes AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION update_profile_total_likes();

CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.comments SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.comments SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.comment_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_comment_like_count AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

CREATE OR REPLACE FUNCTION public.update_gift_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET gift_count = COALESCE(gift_count, 0) + NEW.gift_value WHERE id = NEW.video_id;
    UPDATE public.profiles SET total_gifts = COALESCE(total_gifts, 0) + NEW.gift_value WHERE user_id = NEW.receiver_id;
  END IF; RETURN NULL;
END; $$;

CREATE TRIGGER update_gift_counts AFTER INSERT ON public.gifts FOR EACH ROW EXECUTE FUNCTION update_gift_counts();

CREATE OR REPLACE FUNCTION public.update_video_watch_time()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.videos SET total_watch_time = COALESCE(total_watch_time, 0) + NEW.watch_duration WHERE id = NEW.video_id;
  RETURN NULL;
END; $$;

CREATE TRIGGER update_video_watch_time AFTER INSERT ON public.watch_time FOR EACH ROW EXECUTE FUNCTION update_video_watch_time();

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE conversations SET last_message_id = NEW.id, last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER update_conversation_last_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Live stream triggers
CREATE OR REPLACE FUNCTION public.update_live_viewer_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams SET viewer_count = viewer_count + 1, peak_viewers = GREATEST(peak_viewers, viewer_count + 1) WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE public.live_streams SET viewer_count = GREATEST(viewer_count - 1, 0) WHERE id = NEW.stream_id;
  END IF; RETURN NEW;
END; $$;

CREATE TRIGGER update_live_viewer_count AFTER INSERT OR UPDATE ON public.live_viewers FOR EACH ROW EXECUTE FUNCTION update_live_viewer_count();

CREATE OR REPLACE FUNCTION public.update_live_gift_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.live_streams SET gift_count = gift_count + NEW.gift_value WHERE id = NEW.stream_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER update_live_gift_count AFTER INSERT ON public.live_gifts FOR EACH ROW EXECUTE FUNCTION update_live_gift_count();

-- Notification triggers
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner_id uuid; liker_name text; video_caption text;
BEGIN
  SELECT user_id, caption INTO video_owner_id, video_caption FROM public.videos WHERE id = NEW.video_id;
  IF video_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (video_owner_id, NEW.user_id, NEW.video_id, 'like', liker_name || ' liked your video', jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled')));
  RETURN NEW;
END; $$;

CREATE TRIGGER create_like_notification AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION create_like_notification();

CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner_id uuid; commenter_name text; video_caption text;
BEGIN
  SELECT user_id, caption INTO video_owner_id, video_caption FROM public.videos WHERE id = NEW.video_id;
  IF video_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (video_owner_id, NEW.user_id, NEW.video_id, 'comment', commenter_name || ' commented on your video', jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'), 'comment', LEFT(NEW.content, 100)));
  RETURN NEW;
END; $$;

CREATE TRIGGER create_comment_notification AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION create_comment_notification();

CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name text;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO follower_name FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, from_user_id, type, message) VALUES (NEW.following_id, NEW.follower_id, 'follow', follower_name || ' started following you');
  RETURN NEW;
END; $$;

CREATE TRIGGER create_follow_notification AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION create_follow_notification();

CREATE OR REPLACE FUNCTION public.create_gift_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text; video_caption text;
BEGIN
  IF NEW.receiver_id = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT caption INTO video_caption FROM public.videos WHERE id = NEW.video_id;
  INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
  VALUES (NEW.receiver_id, NEW.sender_id, NEW.video_id, 'gift', sender_name || ' sent you a ' || NEW.gift_type || ' gift!', jsonb_build_object('video_caption', COALESCE(video_caption, 'Untitled'), 'gift_type', NEW.gift_type, 'gift_value', NEW.gift_value));
  RETURN NEW;
END; $$;

CREATE TRIGGER create_gift_notification AFTER INSERT ON public.gifts FOR EACH ROW EXECUTE FUNCTION create_gift_notification();

-- Rate limit enforcement triggers
CREATE OR REPLACE FUNCTION public.enforce_comment_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'comment', 10, 1) THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_comment_rate_limit BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION enforce_comment_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_like_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'like', 30, 1) THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_like_rate_limit BEFORE INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION enforce_like_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_follow_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT check_rate_limit(NEW.follower_id, 'follow', 20, 1) THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_follow_rate_limit BEFORE INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION enforce_follow_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_gift_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT check_rate_limit(NEW.sender_id, 'gift', 30, 1) THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_gift_rate_limit BEFORE INSERT ON public.gifts FOR EACH ROW EXECUTE FUNCTION enforce_gift_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_upload_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'upload', 5, 60) THEN RAISE EXCEPTION 'Upload limit exceeded'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_upload_rate_limit BEFORE INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION enforce_upload_rate_limit();

-- Sound triggers
CREATE OR REPLACE FUNCTION public.auto_extract_sound()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ready' AND NEW.is_public = true AND NEW.video_url IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.sound_library WHERE source_video_id = NEW.id) THEN
      INSERT INTO public.sound_library (title, creator_id, audio_url, duration, source_video_id, is_original)
      VALUES (COALESCE(NEW.music_title, NEW.caption, 'Original Sound'), NEW.user_id, NEW.video_url, COALESCE(NEW.duration, 30), NEW.id, NEW.music_title IS NULL);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER auto_extract_sound AFTER INSERT OR UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION auto_extract_sound();

CREATE OR REPLACE FUNCTION public.increment_sound_use_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.music_title IS NOT NULL AND NEW.status = 'ready' THEN
    UPDATE public.sound_library SET use_count = use_count + 1, updated_at = now()
    WHERE title = NEW.music_title AND source_video_id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER increment_sound_use_count AFTER INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION increment_sound_use_count();

-- Message security trigger
CREATE OR REPLACE FUNCTION public.prevent_message_reroute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN RAISE EXCEPTION 'Cannot change receiver'; END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN RAISE EXCEPTION 'Cannot change conversation'; END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN RAISE EXCEPTION 'Cannot change sender'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER prevent_message_reroute BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION prevent_message_reroute();

-- Anonymized analytics function
CREATE OR REPLACE FUNCTION public.get_anonymized_analytics(p_video_id uuid)
RETURNS TABLE(id uuid, video_id uuid, watch_hour integer, created_at timestamptz, country text, region text, age_group text, gender text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT aa.id, aa.video_id, aa.watch_hour, aa.created_at, aa.country, aa.region, aa.age_group, aa.gender
  FROM public.audience_analytics aa
  INNER JOIN public.videos v ON v.id = aa.video_id
  WHERE aa.video_id = p_video_id AND v.user_id = auth.uid();
$$;
