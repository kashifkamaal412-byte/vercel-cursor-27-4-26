
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.post_likes;

-- Replace with scoped policy: users can see likes on public posts or their own likes
CREATE POLICY "Users can view post likes on public posts or own likes"
ON public.post_likes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_likes.post_id
    AND posts.is_public = true
  )
);
