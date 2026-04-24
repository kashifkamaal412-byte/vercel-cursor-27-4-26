
-- 1. Remove sensitive tables from Realtime publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.audience_analytics; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.earnings; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.watch_time; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.gifts; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 2. Remove the overly permissive public SELECT policy on videos storage bucket
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
