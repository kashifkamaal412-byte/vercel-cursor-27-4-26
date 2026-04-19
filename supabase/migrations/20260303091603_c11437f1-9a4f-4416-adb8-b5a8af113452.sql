-- Add missing columns to comments table for replies, media, privacy, and edit tracking
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

-- Add index for parent_id for fast reply lookups
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Add UPDATE policy for comments so users can edit their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can update own comments'
  ) THEN
    CREATE POLICY "Users can update own comments"
    ON public.comments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
