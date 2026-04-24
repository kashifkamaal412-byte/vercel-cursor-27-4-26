-- Create privacy settings table for user preferences
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile visibility: 'public', 'friends', 'private'
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  
  -- Profile lock (fans-only)
  profile_locked BOOLEAN NOT NULL DEFAULT false,
  
  -- Visibility controls
  show_fans_list BOOLEAN NOT NULL DEFAULT true,
  show_following_list BOOLEAN NOT NULL DEFAULT true,
  show_gifts BOOLEAN NOT NULL DEFAULT true,
  show_gift_history BOOLEAN NOT NULL DEFAULT true,
  show_activity BOOLEAN NOT NULL DEFAULT true,
  
  -- Interaction controls
  who_can_message TEXT NOT NULL DEFAULT 'everyone' CHECK (who_can_message IN ('everyone', 'fans', 'nobody')),
  who_can_gift TEXT NOT NULL DEFAULT 'everyone' CHECK (who_can_gift IN ('everyone', 'fans', 'nobody')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blocked users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create muted users table
CREATE TABLE public.muted_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  muter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(muter_id, muted_id)
);

-- Enable RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

-- Privacy settings policies - users can only manage their own settings
CREATE POLICY "Users can view their own privacy settings"
ON public.privacy_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings"
ON public.privacy_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
ON public.privacy_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can view their blocked list"
ON public.blocked_users FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
ON public.blocked_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others"
ON public.blocked_users FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- Muted users policies
CREATE POLICY "Users can view their muted list"
ON public.muted_users FOR SELECT
TO authenticated
USING (auth.uid() = muter_id);

CREATE POLICY "Users can mute others"
ON public.muted_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = muter_id);

CREATE POLICY "Users can unmute others"
ON public.muted_users FOR DELETE
TO authenticated
USING (auth.uid() = muter_id);

-- Trigger for updated_at
CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create privacy settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_privacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create privacy settings
CREATE TRIGGER on_auth_user_created_privacy
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_privacy();