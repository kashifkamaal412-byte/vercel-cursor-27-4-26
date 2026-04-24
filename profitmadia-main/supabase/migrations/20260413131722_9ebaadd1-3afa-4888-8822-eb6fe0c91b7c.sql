
-- Fix post_comments: restrict SELECT to authenticated users viewing comments on public posts or own posts
DROP POLICY IF EXISTS "Anyone can view post comments" ON public.post_comments;

CREATE POLICY "Users can view post comments on accessible posts"
ON public.post_comments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_comments.post_id
    AND posts.is_public = true
  )
);
