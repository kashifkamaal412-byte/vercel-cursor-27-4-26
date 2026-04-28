-- ==========================================
-- ENABLE RLS AND CREATE BASIC POLICIES
-- ==========================================
-- Run this in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste ALL > Run

-- ==========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ==========================================

-- Core Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Messaging Tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Notification Tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User Management Tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

-- Content Tables
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Activity Tables
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Earnings Tables
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

-- Sound Tables
ALTER TABLE public.sound_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sounds ENABLE ROW LEVEL SECURITY;

-- Analytics Tables
ALTER TABLE public.audience_analytics ENABLE ROW LEVEL SECURITY;

-- Render Tables
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

-- Live Streaming Tables
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pk_battles ENABLE ROW LEVEL SECURITY;

-- Admin Tables
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- Comment interaction tables
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. CREATE BASIC POLICIES FOR AUTHENTICATED USERS
-- ==========================================

-- =====================
-- PROFILES: Public read, own write
-- =====================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- VIDEOS: Public read for public videos, owner full access
-- =====================
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;
CREATE POLICY "Public videos are viewable by everyone" 
  ON public.videos FOR SELECT 
  USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
CREATE POLICY "Users can insert own videos" 
  ON public.videos FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
CREATE POLICY "Users can update own videos" 
  ON public.videos FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
CREATE POLICY "Users can delete own videos" 
  ON public.videos FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================
-- COMMENTS: Public read, authenticated users can comment
-- =====================
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" 
  ON public.comments FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" 
  ON public.comments FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================
-- LIKES: Users can manage own likes
-- =====================
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone" 
  ON public.likes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage own likes" ON public.likes;
CREATE POLICY "Authenticated users can manage own likes" 
  ON public.likes FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- SAVES: Users can manage own saves
-- =====================
DROP POLICY IF EXISTS "Saves are viewable by owner" ON public.saves;
CREATE POLICY "Saves are viewable by owner" 
  ON public.saves FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can manage own saves" ON public.saves;
CREATE POLICY "Authenticated users can manage own saves" 
  ON public.saves FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- FOLLOWS: Public read, authenticated users can follow
-- =====================
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" 
  ON public.follows FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage own follows" ON public.follows;
CREATE POLICY "Authenticated users can manage own follows" 
  ON public.follows FOR ALL 
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- =====================
-- GIFTS: Public read, authenticated users can send
-- =====================
DROP POLICY IF EXISTS "Gifts are viewable by everyone" ON public.gifts;
CREATE POLICY "Gifts are viewable by everyone" 
  ON public.gifts FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send gifts" ON public.gifts;
CREATE POLICY "Authenticated users can send gifts" 
  ON public.gifts FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- =====================
-- MESSAGES: Participants can read/write
-- =====================
DROP POLICY IF EXISTS "Conversation participants can access" ON public.conversations;
CREATE POLICY "Conversation participants can access" 
  ON public.conversations FOR ALL 
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

DROP POLICY IF EXISTS "Message participants can access" ON public.messages;
CREATE POLICY "Message participants can access" 
  ON public.messages FOR ALL 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- =====================
-- NOTIFICATIONS: Users can only see own
-- =====================
DROP POLICY IF EXISTS "Users can only see own notifications" ON public.notifications;
CREATE POLICY "Users can only see own notifications" 
  ON public.notifications FOR ALL 
  USING (auth.uid() = user_id);

-- =====================
-- POSTS: Public read for public posts, owner full access
-- =====================
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
CREATE POLICY "Public posts are viewable by everyone" 
  ON public.posts FOR SELECT 
  USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own posts" ON public.posts;
CREATE POLICY "Users can manage own posts" 
  ON public.posts FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- DRAFTS: Users can only access own
-- =====================
DROP POLICY IF EXISTS "Users can only access own drafts" ON public.drafts;
CREATE POLICY "Users can only access own drafts" 
  ON public.drafts FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- BLOCKED/MUTED USERS: Users manage own
-- =====================
DROP POLICY IF EXISTS "Users can manage own blocked list" ON public.blocked_users;
CREATE POLICY "Users can manage own blocked list" 
  ON public.blocked_users FOR ALL 
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can manage own muted list" ON public.muted_users;
CREATE POLICY "Users can manage own muted list" 
  ON public.muted_users FOR ALL 
  USING (auth.uid() = muter_id)
  WITH CHECK (auth.uid() = muter_id);

-- =====================
-- EARNINGS: Users can only see own
-- =====================
DROP POLICY IF EXISTS "Users can only see own earnings" ON public.earnings;
CREATE POLICY "Users can only see own earnings" 
  ON public.earnings FOR SELECT 
  USING (auth.uid() = user_id);

-- =====================
-- LIVE STREAMS: Public read, creator full access
-- =====================
DROP POLICY IF EXISTS "Live streams are viewable by everyone" ON public.live_streams;
CREATE POLICY "Live streams are viewable by everyone" 
  ON public.live_streams FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Creators can manage own streams" ON public.live_streams;
CREATE POLICY "Creators can manage own streams" 
  ON public.live_streams FOR ALL 
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- =====================
-- PRIVACY SETTINGS: Users can only access own
-- =====================
DROP POLICY IF EXISTS "Users can only access own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users can only access own privacy settings" 
  ON public.privacy_settings FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- USER ROLES: Admins can manage, users can see
-- =====================
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_roles;
CREATE POLICY "User roles are viewable by everyone" 
  ON public.user_roles FOR SELECT 
  USING (true);

-- ==========================================
-- 3. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ==========================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles, public.videos, public.comments, 
  public.likes, public.saves, public.follows, public.gifts, 
  public.posts, public.post_likes, public.post_comments, 
  public.drafts, public.conversations, public.messages, 
  public.privacy_settings, public.blocked_users, public.muted_users, 
  public.earnings, public.live_streams, public.live_chat, 
  public.live_gifts, public.notifications, public.activity_log, 
  public.view_tracking, public.watch_time, public.rate_limits 
TO authenticated;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$ BEGIN
  RAISE NOTICE 'RLS enabled and basic policies created for all tables!';
END $$;
