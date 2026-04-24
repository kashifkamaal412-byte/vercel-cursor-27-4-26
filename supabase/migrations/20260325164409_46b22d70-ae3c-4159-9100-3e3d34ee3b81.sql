
-- Sound Library table for extracted sounds
CREATE TABLE public.sound_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  creator_id uuid NOT NULL,
  audio_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  use_count integer NOT NULL DEFAULT 0,
  genre text DEFAULT 'other',
  is_original boolean DEFAULT true,
  source_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Saved/Favorite sounds
CREATE TABLE public.saved_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sound_id uuid NOT NULL REFERENCES public.sound_library(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sound_id)
);

-- Drafts table
CREATE TABLE public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_url text,
  thumbnail_url text,
  caption text,
  description text,
  video_type text NOT NULL DEFAULT 'short',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sound_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Sound library policies (public read, creator can insert/update)
CREATE POLICY "Anyone can view sounds" ON public.sound_library FOR SELECT USING (true);
CREATE POLICY "Users can insert sounds" ON public.sound_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own sounds" ON public.sound_library FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own sounds" ON public.sound_library FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Saved sounds policies
CREATE POLICY "Users can view own saved sounds" ON public.saved_sounds FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save sounds" ON public.saved_sounds FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave sounds" ON public.saved_sounds FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Drafts policies
CREATE POLICY "Users can view own drafts" ON public.drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create drafts" ON public.drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to auto-extract sound when video is inserted
CREATE OR REPLACE FUNCTION public.auto_extract_sound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'ready' AND NEW.is_public = true AND NEW.video_url IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.sound_library WHERE source_video_id = NEW.id) THEN
      INSERT INTO public.sound_library (title, creator_id, audio_url, duration, source_video_id, is_original)
      VALUES (
        COALESCE(NEW.music_title, NEW.caption, 'Original Sound'),
        NEW.user_id,
        NEW.video_url,
        COALESCE(NEW.duration, 30),
        NEW.id,
        NEW.music_title IS NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_extract_sound
  AFTER INSERT OR UPDATE OF status ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_extract_sound();

-- Function to increment sound use_count
CREATE OR REPLACE FUNCTION public.increment_sound_use_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.music_title IS NOT NULL AND NEW.status = 'ready' THEN
    UPDATE public.sound_library
    SET use_count = use_count + 1, updated_at = now()
    WHERE title = NEW.music_title AND source_video_id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_increment_sound_use
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_sound_use_count();

-- Notification when someone uses your sound
CREATE OR REPLACE FUNCTION public.create_sound_use_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sound_creator_id uuid;
  user_name text;
BEGIN
  IF NEW.music_title IS NOT NULL AND NEW.status = 'ready' THEN
    SELECT sl.creator_id INTO sound_creator_id
    FROM public.sound_library sl
    WHERE sl.title = NEW.music_title
    LIMIT 1;
    
    IF sound_creator_id IS NOT NULL AND sound_creator_id != NEW.user_id THEN
      SELECT COALESCE(display_name, username, 'Someone') INTO user_name
      FROM public.profiles WHERE user_id = NEW.user_id;
      
      INSERT INTO public.notifications (user_id, from_user_id, video_id, type, message, metadata)
      VALUES (
        sound_creator_id, NEW.user_id, NEW.id, 'sound_use',
        user_name || ' used your sound "' || NEW.music_title || '" to create a video',
        jsonb_build_object('sound_title', NEW.music_title, 'video_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_sound_use_notification
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sound_use_notification();

-- Create sounds storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('sounds', 'sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sounds bucket
CREATE POLICY "Anyone can view sounds files" ON storage.objects FOR SELECT USING (bucket_id = 'sounds');
CREATE POLICY "Authenticated users can upload sounds" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sounds');
CREATE POLICY "Users can delete own sounds" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sounds' AND (storage.foldername(name))[1] = auth.uid()::text);
