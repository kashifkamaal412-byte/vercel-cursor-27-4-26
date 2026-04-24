
-- ============================================
-- Core Tables (app_role enum already exists)
-- ============================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  username text,
  bio text,
  avatar_url text,
  cover_url text,
  website text,
  instagram text,
  twitter text,
  youtube text,
  tiktok text,
  activity_status text DEFAULT 'active',
  creator_score integer DEFAULT 0,
  trust_level integer DEFAULT 1,
  total_views integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_followers integer DEFAULT 0,
  total_following integer DEFAULT 0,
  total_gifts integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  description text,
  tags text[],
  music_title text,
  video_type text DEFAULT 'short',
  status text NOT NULL DEFAULT 'processing',
  location text,
  external_link text,
  age_restriction text DEFAULT 'everyone',
  duration integer DEFAULT 0,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  gift_count integer DEFAULT 0,
  total_watch_time integer DEFAULT 0,
  is_public boolean DEFAULT true,
  is_trending boolean DEFAULT false,
  allow_comments boolean DEFAULT true,
  allow_duet boolean DEFAULT true,
  pinned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public videos" ON public.videos;
CREATE POLICY "Anyone can view public videos" ON public.videos FOR SELECT USING (is_public = true);
DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
CREATE POLICY "Users can view own videos" ON public.videos FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
CREATE POLICY "Users can insert own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can delete any video" ON public.videos;
CREATE POLICY "Admins can delete any video" ON public.videos FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view likes" ON public.likes;
CREATE POLICY "Users can view likes" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like videos" ON public.likes;
CREATE POLICY "Users can like videos" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike videos" ON public.likes;
CREATE POLICY "Users can unlike videos" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  media_url text,
  is_private boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  like_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
CREATE POLICY "Users can view comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can add comments" ON public.comments;
CREATE POLICY "Users can add comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment" ON public.comments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Comment Likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comment likes" ON public.comment_likes;
CREATE POLICY "Users can view comment likes" ON public.comment_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Comment Reports
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can report comments" ON public.comment_reports;
CREATE POLICY "Users can report comments" ON public.comment_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own reports" ON public.comment_reports;
CREATE POLICY "Users can view own reports" ON public.comment_reports FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all reports" ON public.comment_reports;
CREATE POLICY "Admins can view all reports" ON public.comment_reports FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Saves
CREATE TABLE IF NOT EXISTS public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saves" ON public.saves;
CREATE POLICY "Users can view own saves" ON public.saves FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can save videos" ON public.saves;
CREATE POLICY "Users can save videos" ON public.saves FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unsave videos" ON public.saves;
CREATE POLICY "Users can unsave videos" ON public.saves FOR DELETE USING (auth.uid() = user_id);

-- Gifts
CREATE TABLE IF NOT EXISTS public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  gift_type text NOT NULL DEFAULT 'heart',
  gift_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can send gifts" ON public.gifts;
CREATE POLICY "Users can send gifts" ON public.gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can view own gifts" ON public.gifts;
CREATE POLICY "Users can view own gifts" ON public.gifts FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Earnings
CREATE TABLE IF NOT EXISTS public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  earning_type text NOT NULL DEFAULT 'views',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own earnings" ON public.earnings;
CREATE POLICY "Users can view own earnings" ON public.earnings FOR SELECT USING (auth.uid() = user_id);

-- Blocked Users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their blocked list" ON public.blocked_users;
CREATE POLICY "Users can view their blocked list" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users can block others" ON public.blocked_users;
CREATE POLICY "Users can block others" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users can unblock others" ON public.blocked_users;
CREATE POLICY "Users can unblock others" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Admins can manage blocked users" ON public.blocked_users;
CREATE POLICY "Admins can manage blocked users" ON public.blocked_users FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Muted Users
CREATE TABLE IF NOT EXISTS public.muted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL,
  muted_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(muter_id, muted_id)
);
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their muted list" ON public.muted_users;
CREATE POLICY "Users can view their muted list" ON public.muted_users FOR SELECT USING (auth.uid() = muter_id);
DROP POLICY IF EXISTS "Users can mute others" ON public.muted_users;
CREATE POLICY "Users can mute others" ON public.muted_users FOR INSERT WITH CHECK (auth.uid() = muter_id);
DROP POLICY IF EXISTS "Users can unmute others" ON public.muted_users;
CREATE POLICY "Users can unmute others" ON public.muted_users FOR DELETE USING (auth.uid() = muter_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  video_id uuid,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one uuid NOT NULL,
  participant_two uuid NOT NULL,
  last_message_id uuid,
  last_message_at timestamptz DEFAULT now(),
  initiated_by uuid,
  request_message_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_one OR auth.uid() = participant_two);
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE USING (auth.uid() = participant_one OR auth.uid() = participant_two);
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations" ON public.conversations FOR DELETE USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  gift_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  is_delivered boolean NOT NULL DEFAULT true,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  reactions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;
CREATE POLICY "Receivers can mark messages as read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- Privacy Settings
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_visibility text NOT NULL DEFAULT 'public',
  profile_locked boolean NOT NULL DEFAULT false,
  who_can_message text NOT NULL DEFAULT 'everyone',
  who_can_gift text NOT NULL DEFAULT 'everyone',
  show_fans_list boolean NOT NULL DEFAULT true,
  show_following_list boolean NOT NULL DEFAULT true,
  show_gifts boolean NOT NULL DEFAULT true,
  show_gift_history boolean NOT NULL DEFAULT true,
  show_activity boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users can view their own privacy settings" ON public.privacy_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users can insert their own privacy settings" ON public.privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users can update their own privacy settings" ON public.privacy_settings FOR UPDATE USING (auth.uid() = user_id);

-- View Tracking
CREATE TABLE IF NOT EXISTS public.view_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
ALTER TABLE public.view_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own view tracking" ON public.view_tracking;
CREATE POLICY "Users can view own view tracking" ON public.view_tracking FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users can track views" ON public.view_tracking;
CREATE POLICY "Authenticated users can track views" ON public.view_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Watch Time
CREATE TABLE IF NOT EXISTS public.watch_time (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  watch_duration integer NOT NULL DEFAULT 0,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.watch_time ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can record watch time" ON public.watch_time;
CREATE POLICY "Users can record watch time" ON public.watch_time FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Watch time viewable by video owner" ON public.watch_time;
CREATE POLICY "Watch time viewable by video owner" ON public.watch_time FOR SELECT USING (
  auth.uid() IN (SELECT videos.user_id FROM videos WHERE videos.id = watch_time.video_id)
);

-- Audience Analytics
CREATE TABLE IF NOT EXISTS public.audience_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  viewer_id uuid,
  watch_hour integer,
  country text,
  region text,
  age_group text,
  gender text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audience_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Video owners can view audience analytics" ON public.audience_analytics;
CREATE POLICY "Video owners can view audience analytics" ON public.audience_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos v WHERE v.id = audience_analytics.video_id AND v.user_id = auth.uid())
);

-- Activity Log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  activity_type text NOT NULL,
  video_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activities only" ON public.activity_log;
CREATE POLICY "Users can view their own activities only" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can log activities" ON public.activity_log;
CREATE POLICY "Users can log activities" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rate Limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  UNIQUE(user_id, action_type)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;
CREATE POLICY "Users can view own rate limits" ON public.rate_limits FOR SELECT USING (auth.uid() = user_id);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role or admins can view all" ON public.user_roles;
CREATE POLICY "Users can view own role or admins can view all" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Admin Chat Messages
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view chat messages" ON public.admin_chat_messages;
CREATE POLICY "Only admins can view chat messages" ON public.admin_chat_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can insert chat messages" ON public.admin_chat_messages;
CREATE POLICY "Only admins can insert chat messages" ON public.admin_chat_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- AI Alerts
CREATE TABLE IF NOT EXISTS public.ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view alerts" ON public.ai_alerts;
CREATE POLICY "Only admins can view alerts" ON public.ai_alerts FOR SELECT USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can insert alerts" ON public.ai_alerts;
CREATE POLICY "Only admins can insert alerts" ON public.ai_alerts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can update alerts" ON public.ai_alerts;
CREATE POLICY "Only admins can update alerts" ON public.ai_alerts FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- AI Tasks
CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view tasks" ON public.ai_tasks;
CREATE POLICY "Only admins can view tasks" ON public.ai_tasks FOR SELECT USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can manage tasks" ON public.ai_tasks;
CREATE POLICY "Only admins can manage tasks" ON public.ai_tasks FOR ALL USING (has_role(auth.uid(), 'admin'));
