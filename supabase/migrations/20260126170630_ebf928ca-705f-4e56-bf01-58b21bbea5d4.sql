-- Fix 1: Update 'friends' mode to require MUTUAL following (both users follow each other)
-- Drop and recreate the policy for profile visibility with mutual following check

DROP POLICY IF EXISTS "Users can view profiles respecting privacy" ON public.profiles;

CREATE POLICY "Users can view profiles respecting privacy" 
ON public.profiles 
FOR SELECT 
USING (
  -- Not blocked by profile owner
  NOT EXISTS (
    SELECT 1 FROM blocked_users bu
    WHERE bu.blocker_id = profiles.user_id 
    AND bu.blocked_id = auth.uid()
  )
  AND (
    -- Own profile - always visible
    user_id = auth.uid()
    -- Public visibility
    OR COALESCE((SELECT profile_visibility FROM privacy_settings WHERE privacy_settings.user_id = profiles.user_id), 'public') = 'public'
    -- Friends mode - now requires MUTUAL following (both follow each other)
    OR (
      COALESCE((SELECT profile_visibility FROM privacy_settings WHERE privacy_settings.user_id = profiles.user_id), 'public') = 'friends'
      AND EXISTS (
        SELECT 1 FROM follows f1
        INNER JOIN follows f2 
          ON f1.following_id = f2.follower_id 
          AND f1.follower_id = f2.following_id
        WHERE f1.follower_id = auth.uid() 
          AND f1.following_id = profiles.user_id
      )
    )
  )
);

-- Fix 2: Add rate limiting infrastructure for spam prevention

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, action_type)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own rate limits
CREATE POLICY "Users can view own rate limits"
ON public.rate_limits FOR SELECT
USING (auth.uid() = user_id);

-- System can insert/update rate limits (via trigger)
CREATE POLICY "System can manage rate limits"
ON public.rate_limits FOR ALL
USING (true)
WITH CHECK (true);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _action_type text,
  _max_actions integer,
  _window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_time timestamp with time zone;
BEGIN
  -- Get current count and window start
  SELECT action_count, window_start INTO current_count, window_time
  FROM rate_limits
  WHERE user_id = _user_id AND action_type = _action_type;
  
  -- No record exists, create one and allow
  IF current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
    VALUES (_user_id, _action_type, 1, now())
    ON CONFLICT (user_id, action_type) 
    DO UPDATE SET action_count = 1, window_start = now();
    RETURN true;
  END IF;
  
  -- Window expired, reset and allow
  IF now() - window_time > (_window_minutes || ' minutes')::interval THEN
    UPDATE rate_limits
    SET action_count = 1, window_start = now()
    WHERE user_id = _user_id AND action_type = _action_type;
    RETURN true;
  END IF;
  
  -- Check if limit exceeded
  IF current_count >= _max_actions THEN
    RETURN false;
  END IF;
  
  -- Increment count and allow
  UPDATE rate_limits
  SET action_count = action_count + 1
  WHERE user_id = _user_id AND action_type = _action_type;
  
  RETURN true;
END;
$$;

-- Rate limit trigger function for comments (10 per minute)
CREATE OR REPLACE FUNCTION public.enforce_comment_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'comment', 10, 1) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before commenting again.';
  END IF;
  RETURN NEW;
END;
$$;

-- Rate limit trigger function for likes (30 per minute)
CREATE OR REPLACE FUNCTION public.enforce_like_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'like', 30, 1) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before liking again.';
  END IF;
  RETURN NEW;
END;
$$;

-- Rate limit trigger function for follows (20 per minute)
CREATE OR REPLACE FUNCTION public.enforce_follow_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.follower_id, 'follow', 20, 1) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before following again.';
  END IF;
  RETURN NEW;
END;
$$;

-- Rate limit trigger function for gifts (30 per minute)
CREATE OR REPLACE FUNCTION public.enforce_gift_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.sender_id, 'gift', 30, 1) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending gifts again.';
  END IF;
  RETURN NEW;
END;
$$;

-- Rate limit trigger function for video uploads (5 per hour)
CREATE OR REPLACE FUNCTION public.enforce_upload_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'upload', 5, 60) THEN
    RAISE EXCEPTION 'Upload limit exceeded. You can upload up to 5 videos per hour.';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply rate limit triggers
DROP TRIGGER IF EXISTS rate_limit_comments ON public.comments;
CREATE TRIGGER rate_limit_comments
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_comment_rate_limit();

DROP TRIGGER IF EXISTS rate_limit_likes ON public.likes;
CREATE TRIGGER rate_limit_likes
  BEFORE INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_like_rate_limit();

DROP TRIGGER IF EXISTS rate_limit_follows ON public.follows;
CREATE TRIGGER rate_limit_follows
  BEFORE INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION enforce_follow_rate_limit();

DROP TRIGGER IF EXISTS rate_limit_gifts ON public.gifts;
CREATE TRIGGER rate_limit_gifts
  BEFORE INSERT ON public.gifts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_gift_rate_limit();

DROP TRIGGER IF EXISTS rate_limit_uploads ON public.videos;
CREATE TRIGGER rate_limit_uploads
  BEFORE INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION enforce_upload_rate_limit();

-- Backfill privacy settings for all users who don't have them
INSERT INTO public.privacy_settings (user_id)
SELECT p.user_id FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.privacy_settings ps WHERE ps.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;