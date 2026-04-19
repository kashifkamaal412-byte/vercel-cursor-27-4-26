
-- =====================
-- FIX 1: user_roles - Consolidate policies to prevent privilege escalation
-- =====================

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role or admins can view all" ON public.user_roles;

-- Recreate clean policies
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================
-- FIX 2: post_likes - Restrict to authenticated users only
-- =====================

DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;

CREATE POLICY "Authenticated users can view post likes"
ON public.post_likes FOR SELECT
TO authenticated
USING (true);

-- =====================
-- FIX 3: videos storage bucket - Restrict reads to owner or public videos
-- =====================

DROP POLICY IF EXISTS "Authenticated users can read videos" ON storage.objects;

CREATE POLICY "Users can read own videos or public videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.video_url LIKE '%' || storage.filename(name)
        AND v.is_public = true
    )
  )
);
