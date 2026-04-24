-- 1. Fix comment_likes: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view comment likes" ON public.comment_likes;
CREATE POLICY "Users can view comment likes"
ON public.comment_likes FOR SELECT
TO authenticated
USING (true);

-- 2. Fix comments: add video accessibility check to the broader SELECT policy
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
CREATE POLICY "Users can view comments"
ON public.comments FOR SELECT
USING (
  (is_private = false OR auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM videos v WHERE v.id = comments.video_id AND v.user_id = auth.uid()
  ))
  AND EXISTS (
    SELECT 1 FROM videos v WHERE v.id = comments.video_id AND (v.is_public = true OR v.user_id = auth.uid())
  )
);