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
