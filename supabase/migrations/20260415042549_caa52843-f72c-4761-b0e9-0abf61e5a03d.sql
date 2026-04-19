-- Remove private messages table from realtime publication to prevent eavesdropping
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;