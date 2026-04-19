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
