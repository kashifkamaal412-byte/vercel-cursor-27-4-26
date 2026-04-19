-- ===========================================
-- COMPLETE DATABASE SETUP - ONE-CLICK SCRIPT
-- ===========================================
-- Run this ENTIRE script in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste ALL > Run
-- ===========================================

-- =====================
-- 1. ENUMS
-- =====================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================
-- 2. CORE TABLES
-- =====================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  cover_url text,
  website text,
  instagram text,
  twitter text,
  youtube text,
  tiktok text,
  creator_score integer DEFAULT 0,
  trust_level integer DEFAULT 1,
  activity_status text DEFAULT 'active',
  total_views integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_followers integer DEFAULT 0,
  total_following integer DEFAULT 0,
  total_gifts integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  description text,
  duration integer,
  video_type text DEFAULT 'short',
  status text NOT NULL DEFAULT 'ready',
  is_public boolean DEFAULT true,
  is_trending boolean DEFAULT false,
  music_title text,
  tags text[],
  location text,
  external_link text,
  age_restriction text,
  allow_comments boolean DEFAULT true,
  allow_duet boolean DEFAULT true,
  pinned_at timestamptz,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  gift_count integer DEFAULT 0,
  total_watch_time integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  media_url text,
  is_private boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  like_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Saves
CREATE TABLE IF NOT EXISTS public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Gifts
CREATE TABLE IF NOT EXISTS public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  video_id uuid NOT NULL,
  gift_type text NOT NULL DEFAULT 'heart',
  gift_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one uuid NOT NULL,
  participant_two uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  initiated_by uuid,
  last_message_id uuid,
  last_message_at timestamptz DEFAULT now(),
  request_message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_one, participant_two)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  gift_id uuid,
  reply_to_id uuid REFERENCES public.messages(id),
  reactions jsonb DEFAULT '[]'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_delivered boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  video_id uuid,
  metadata jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Privacy Settings
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_visibility text NOT NULL DEFAULT 'public',
  profile_locked boolean NOT NULL DEFAULT false,
  show_activity boolean NOT NULL DEFAULT true,
  show_gifts boolean NOT NULL DEFAULT true,
  show_gift_history boolean NOT NULL DEFAULT true,
  show_following_list boolean NOT NULL DEFAULT true,
  show_fans_list boolean NOT NULL DEFAULT true,
  who_can_message text NOT NULL DEFAULT 'everyone',
  who_can_gift text NOT NULL DEFAULT 'everyone',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comment Likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Comment Reports
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- View Tracking
CREATE TABLE IF NOT EXISTS public.view_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Watch Time
CREATE TABLE IF NOT EXISTS public.watch_time (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  watch_duration integer NOT NULL DEFAULT 0,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Blocked Users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Muted Users
CREATE TABLE IF NOT EXISTS public.muted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL,
  muted_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(muter_id, muted_id)
);

-- Earnings
CREATE TABLE IF NOT EXISTS public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  earning_type text NOT NULL DEFAULT 'views',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Drafts
CREATE TABLE IF NOT EXISTS public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  caption text,
  description text,
  video_url text,
  thumbnail_url text,
  video_type text NOT NULL DEFAULT 'short',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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

-- Rate Limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  UNIQUE(user_id, action_type)
);

-- Sound Library
CREATE TABLE IF NOT EXISTS public.sound_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  creator_id uuid NOT NULL,
  audio_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  use_count integer NOT NULL DEFAULT 0,
  genre text DEFAULT 'other',
  is_original boolean DEFAULT true,
  source_video_id uuid REFERENCES public.videos(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Saved Sounds
CREATE TABLE IF NOT EXISTS public.saved_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sound_id uuid NOT NULL REFERENCES public.sound_library(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sound_id)
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

-- Render Jobs
CREATE TABLE IF NOT EXISTS public.render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  render_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Live Streams
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Live Stream',
  status text NOT NULL DEFAULT 'setup',
  audience_type text NOT NULL DEFAULT 'public',
  category text DEFAULT 'general',
  thumbnail_url text,
  viewer_count integer DEFAULT 0,
  peak_viewers integer DEFAULT 0,
  like_count integer DEFAULT 0,
  gift_count integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Live Chat
CREATE TABLE IF NOT EXISTS public.live_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  is_pinned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Live Gifts
CREATE TABLE IF NOT EXISTS public.live_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  gift_type text NOT NULL,
  gift_value integer NOT NULL DEFAULT 1,
  gift_image text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Live Viewers
CREATE TABLE IF NOT EXISTS public.live_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz
);

-- Live Guests
CREATE TABLE IF NOT EXISTS public.live_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  slot_position integer DEFAULT 1,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PK Battles
CREATE TABLE IF NOT EXISTS public.pk_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_a_id uuid NOT NULL REFERENCES public.live_streams(id),
  stream_b_id uuid NOT NULL REFERENCES public.live_streams(id),
  status text NOT NULL DEFAULT 'pending',
  score_a integer DEFAULT 0,
  score_b integer DEFAULT 0,
  duration_seconds integer DEFAULT 180,
  winner_stream_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  image_url text,
  location text,
  tags text[],
  is_public boolean DEFAULT true,
  allow_comments boolean DEFAULT true,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  gift_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Admin Chat Messages
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Alerts
CREATE TABLE IF NOT EXISTS public.ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- User Warnings
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  admin_id uuid,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sound_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pk_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- =====================
-- PROFILES
-- =====================
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- =====================
-- VIDEOS
-- =====================
CREATE POLICY "Anyone can view public videos" ON public.videos FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Users can insert own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- COMMENTS
-- =====================
CREATE POLICY "Anyone can view comments on public videos" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos WHERE id = comments.video_id AND (is_public = true OR user_id = auth.uid()))
);
CREATE POLICY "Users can add comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- LIKES
-- =====================
CREATE POLICY "Users can view likes" ON public.likes FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT v.user_id FROM videos v WHERE v.id = likes.video_id));
CREATE POLICY "Users can like videos" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike videos" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- SAVES
-- =====================
CREATE POLICY "Users can view own saves" ON public.saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save videos" ON public.saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave videos" ON public.saves FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- FOLLOWS
-- =====================
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- =====================
-- GIFTS
-- =====================
CREATE POLICY "Gifts viewable by participants" ON public.gifts FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send gifts" ON public.gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- =====================
-- CONVERSATIONS
-- =====================
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE USING (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY "Users can delete their conversations" ON public.conversations FOR DELETE USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- =====================
-- MESSAGES
-- =====================
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Senders can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Receivers can mark messages as read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- USER ROLES
-- =====================
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- PRIVACY SETTINGS
-- =====================
CREATE POLICY "Users can view own privacy" ON public.privacy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own privacy" ON public.privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own privacy" ON public.privacy_settings FOR UPDATE USING (auth.uid() = user_id);

-- =====================
-- COMMENT LIKES
-- =====================
CREATE POLICY "Users can view comment likes" ON public.comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- COMMENT REPORTS
-- =====================
CREATE POLICY "Users can report comments" ON public.comment_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reports" ON public.comment_reports FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- VIEW TRACKING
-- =====================
CREATE POLICY "Users can view own tracking" ON public.view_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert tracking" ON public.view_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================
-- WATCH TIME
-- =====================
CREATE POLICY "Users can insert watch time" ON public.watch_time FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own watch time" ON public.watch_time FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- BLOCKED USERS
-- =====================
CREATE POLICY "Users can view their blocked list" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock others" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- =====================
-- MUTED USERS
-- =====================
CREATE POLICY "Users can view their muted list" ON public.muted_users FOR SELECT USING (auth.uid() = muter_id);
CREATE POLICY "Users can mute others" ON public.muted_users FOR INSERT WITH CHECK (auth.uid() = muter_id);
CREATE POLICY "Users can unmute others" ON public.muted_users FOR DELETE USING (auth.uid() = muter_id);

-- =====================
-- EARNINGS
-- =====================
CREATE POLICY "Users can view own earnings" ON public.earnings FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- DRAFTS
-- =====================
CREATE POLICY "Users can view own drafts" ON public.drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create drafts" ON public.drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================
-- ACTIVITY LOG
-- =====================
CREATE POLICY "Users can log activities" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own activities" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- RATE LIMITS
-- =====================
CREATE POLICY "Users can view own rate limits" ON public.rate_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "No direct insert on rate_limits" ON public.rate_limits FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No direct update on rate_limits" ON public.rate_limits FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No direct delete on rate_limits" ON public.rate_limits FOR DELETE TO authenticated USING (false);

-- =====================
-- SOUND LIBRARY
-- =====================
CREATE POLICY "Anyone can view sounds" ON public.sound_library FOR SELECT USING (true);
CREATE POLICY "Users can insert sounds" ON public.sound_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own sounds" ON public.sound_library FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own sounds" ON public.sound_library FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- =====================
-- SAVED SOUNDS
-- =====================
CREATE POLICY "Users can view own saved sounds" ON public.saved_sounds FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save sounds" ON public.saved_sounds FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave sounds" ON public.saved_sounds FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================
-- AUDIENCE ANALYTICS
-- =====================
CREATE POLICY "Video owners can view analytics" ON public.audience_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos v WHERE v.id = audience_analytics.video_id AND v.user_id = auth.uid())
);

-- =====================
-- RENDER JOBS
-- =====================
CREATE POLICY "Users can view own render jobs" ON public.render_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own render jobs" ON public.render_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =====================
-- LIVE STREAMS
-- =====================
CREATE POLICY "Anyone can view active public streams" ON public.live_streams FOR SELECT USING (status = 'live' AND audience_type = 'public');
CREATE POLICY "Creators can view own streams" ON public.live_streams FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can insert own streams" ON public.live_streams FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own streams" ON public.live_streams FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own streams" ON public.live_streams FOR DELETE USING (auth.uid() = creator_id);

-- =====================
-- LIVE CHAT
-- =====================
CREATE POLICY "Authenticated can view chat" ON public.live_chat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send chat" ON public.live_chat FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat" ON public.live_chat FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Stream creator can pin" ON public.live_chat FOR UPDATE USING (
  EXISTS (SELECT 1 FROM live_streams WHERE id = live_chat.stream_id AND creator_id = auth.uid())
);

-- =====================
-- LIVE GIFTS
-- =====================
CREATE POLICY "Authenticated can view live gifts" ON public.live_gifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send live gifts" ON public.live_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- =====================
-- LIVE VIEWERS
-- =====================
CREATE POLICY "Viewers can join streams" ON public.live_viewers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Viewers can update own record" ON public.live_viewers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Relevant users can view viewers" ON public.live_viewers FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM live_streams WHERE id = live_viewers.stream_id AND creator_id = auth.uid())
);

-- =====================
-- LIVE GUESTS
-- =====================
CREATE POLICY "Anyone can view guests" ON public.live_guests FOR SELECT USING (true);
CREATE POLICY "Users can request to join" ON public.live_guests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creator or guest can update" ON public.live_guests FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM live_streams WHERE id = live_guests.stream_id AND creator_id = auth.uid())
);
CREATE POLICY "Creator or guest can delete" ON public.live_guests FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM live_streams WHERE id = live_guests.stream_id AND creator_id = auth.uid())
);

-- =====================
-- PK BATTLES
-- =====================
CREATE POLICY "Anyone can view pk battles" ON public.pk_battles FOR SELECT USING (true);
CREATE POLICY "Creators can manage pk battles" ON public.pk_battles FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT creator_id FROM live_streams WHERE id = ANY(ARRAY[pk_battles.stream_a_id, pk_battles.stream_b_id]))
);
CREATE POLICY "Creators can update pk battles" ON public.pk_battles FOR UPDATE USING (
  auth.uid() IN (SELECT creator_id FROM live_streams WHERE id = ANY(ARRAY[pk_battles.stream_a_id, pk_battles.stream_b_id]))
);

-- =====================
-- POSTS
-- =====================
CREATE POLICY "Anyone can view public posts" ON public.posts FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own posts" ON public.posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================
-- POST LIKES
-- =====================
CREATE POLICY "Anyone can view post likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================
-- POST COMMENTS
-- =====================
CREATE POLICY "Anyone can view post comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create post comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own post comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================
-- ADMIN TABLES
-- =====================
CREATE POLICY "Admin chat - admin only view" ON public.admin_chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin chat - admin only insert" ON public.admin_chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "AI alerts - admin only view" ON public.ai_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "AI alerts - admin only insert" ON public.ai_alerts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "AI alerts - admin only update" ON public.ai_alerts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "AI tasks - admin only" ON public.ai_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Warnings - admin manage" ON public.user_warnings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Warnings - users view own" ON public.user_warnings FOR SELECT TO authenticated USING (user_id = auth.uid());
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
-- ===========================================
-- STORAGE BUCKETS
-- ===========================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('sounds', 'sounds', true) ON CONFLICT (id) DO NOTHING;

-- =====================
-- AVATARS (public read, owner write)
-- =====================
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- COVERS (public read, owner write)
-- =====================
CREATE POLICY "Cover images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Users can upload their own cover" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own cover" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own cover" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- THUMBNAILS (public read, owner write)
-- =====================
CREATE POLICY "Thumbnails are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Users can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update thumbnails" ON storage.objects FOR UPDATE USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- VIDEOS (private - signed URLs only, owner write)
-- =====================
CREATE POLICY "Users can upload their own videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own videos" ON storage.objects FOR UPDATE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own videos" ON storage.objects FOR DELETE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated users can view videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos');

-- =====================
-- SOUNDS (public read, owner write)
-- =====================
CREATE POLICY "Sounds are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'sounds');
CREATE POLICY "Users can upload sounds" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update sounds" ON storage.objects FOR UPDATE USING (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete sounds" ON storage.objects FOR DELETE USING (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- REALTIME
-- =====================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
