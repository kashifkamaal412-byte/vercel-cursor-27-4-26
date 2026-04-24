
-- Live Streams table
CREATE TABLE public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Live Stream',
  category TEXT DEFAULT 'general',
  audience_type TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'setup',
  viewer_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  gift_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active public streams" ON public.live_streams FOR SELECT USING (status = 'live' AND audience_type = 'public');
CREATE POLICY "Creators can view own streams" ON public.live_streams FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can insert own streams" ON public.live_streams FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own streams" ON public.live_streams FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own streams" ON public.live_streams FOR DELETE USING (auth.uid() = creator_id);

-- Live Viewers table
CREATE TABLE public.live_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(stream_id, user_id)
);

ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers can join streams" ON public.live_viewers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Viewers can update own record" ON public.live_viewers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active viewers" ON public.live_viewers FOR SELECT USING (true);

-- Live Chat Messages table
CREATE TABLE public.live_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send chat messages" ON public.live_chat FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view chat messages" ON public.live_chat FOR SELECT USING (true);
CREATE POLICY "Stream creator can pin messages" ON public.live_chat FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.live_streams WHERE id = live_chat.stream_id AND creator_id = auth.uid())
);
CREATE POLICY "Users can delete own messages" ON public.live_chat FOR DELETE USING (auth.uid() = user_id);

-- Live Gifts table
CREATE TABLE public.live_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  gift_type TEXT NOT NULL,
  gift_value INTEGER NOT NULL DEFAULT 1,
  gift_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send live gifts" ON public.live_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Anyone can view live gifts" ON public.live_gifts FOR SELECT USING (true);

-- PK Battles table
CREATE TABLE public.pk_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_a_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  stream_b_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_seconds INTEGER DEFAULT 180,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_stream_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pk_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pk battles" ON public.pk_battles FOR SELECT USING (true);
CREATE POLICY "Stream creators can manage pk battles" ON public.pk_battles FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT creator_id FROM public.live_streams WHERE id IN (stream_a_id, stream_b_id)
  )
);
CREATE POLICY "Stream creators can update pk battles" ON public.pk_battles FOR UPDATE USING (
  auth.uid() IN (
    SELECT creator_id FROM public.live_streams WHERE id IN (stream_a_id, stream_b_id)
  )
);

-- Multi-Guest table
CREATE TABLE public.live_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  slot_position INTEGER DEFAULT 1,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

ALTER TABLE public.live_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guests" ON public.live_guests FOR SELECT USING (true);
CREATE POLICY "Users can request to join" ON public.live_guests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Stream creator or guest can update" ON public.live_guests FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams WHERE id = live_guests.stream_id AND creator_id = auth.uid())
);
CREATE POLICY "Stream creator or guest can delete" ON public.live_guests FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams WHERE id = live_guests.stream_id AND creator_id = auth.uid())
);

-- Enable realtime for live tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pk_battles;

-- Function to update viewer count
CREATE OR REPLACE FUNCTION public.update_live_viewer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams SET viewer_count = viewer_count + 1, peak_viewers = GREATEST(peak_viewers, viewer_count + 1) WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE public.live_streams SET viewer_count = GREATEST(viewer_count - 1, 0) WHERE id = NEW.stream_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_viewer_change AFTER INSERT OR UPDATE ON public.live_viewers FOR EACH ROW EXECUTE FUNCTION public.update_live_viewer_count();

-- Function to update live gift count
CREATE OR REPLACE FUNCTION public.update_live_gift_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_streams SET gift_count = gift_count + NEW.gift_value WHERE id = NEW.stream_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_live_gift AFTER INSERT ON public.live_gifts FOR EACH ROW EXECUTE FUNCTION public.update_live_gift_count();
