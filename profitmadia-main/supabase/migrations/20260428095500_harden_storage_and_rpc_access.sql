-- Harden Supabase storage and RPC exposure without breaking current app flows.

-- Public buckets do not need broad SELECT policies for object URL access.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Sounds are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Thumbnails are publicly accessible" ON storage.objects;

-- Videos are served through signed URLs in the app, so make the bucket private
-- and allow signing only for objects tied to public videos or the owner's content.
UPDATE storage.buckets
SET public = false
WHERE id = 'videos';

DROP POLICY IF EXISTS "Authenticated users can view videos" ON storage.objects;
CREATE POLICY "Authenticated users can view allowed videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.video_url = storage.objects.name
      AND (v.is_public = true OR v.user_id = auth.uid())
  )
);

-- Keep direct table access safe and avoid exposing analytics via RPC.
CREATE OR REPLACE FUNCTION public.get_anonymized_analytics(p_video_id uuid)
RETURNS TABLE(
  id uuid,
  video_id uuid,
  watch_hour integer,
  created_at timestamptz,
  country text,
  region text,
  age_group text,
  gender text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    aa.id,
    aa.video_id,
    aa.watch_hour,
    aa.created_at,
    aa.country,
    aa.region,
    aa.age_group,
    aa.gender
  FROM public.audience_analytics aa
  INNER JOIN public.videos v ON v.id = aa.video_id
  WHERE aa.video_id = p_video_id
    AND v.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one uuid, user_two uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
  p1 uuid;
  p2 uuid;
BEGIN
  IF auth.uid() != user_one AND auth.uid() != user_two THEN
    RAISE EXCEPTION 'Unauthorized: cannot create conversation for other users';
  END IF;

  IF user_one < user_two THEN
    p1 := user_one;
    p2 := user_two;
  ELSE
    p1 := user_two;
    p2 := user_one;
  END IF;

  SELECT id INTO conv_id
  FROM public.conversations
  WHERE participant_one = p1
    AND participant_two = p2;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_one, participant_two, initiated_by)
    VALUES (p1, p2, auth.uid())
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$;

-- Count views from regular inserts so the app no longer needs a privileged RPC.
CREATE OR REPLACE FUNCTION public.handle_view_tracking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = NEW.video_id;

  UPDATE public.profiles
  SET total_views = COALESCE(total_views, 0) + 1
  WHERE user_id = (
    SELECT user_id
    FROM public.videos
    WHERE id = NEW.video_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_view_tracking_insert ON public.view_tracking;
CREATE TRIGGER on_view_tracking_insert
AFTER INSERT ON public.view_tracking
FOR EACH ROW
EXECUTE FUNCTION public.handle_view_tracking_insert();

-- Remove public/authenticated RPC access from privileged helper functions.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> 'update_updated_at_column'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM public, anon, authenticated',
      fn.schema_name,
      fn.function_name,
      fn.args
    );
  END LOOP;
END $$;
