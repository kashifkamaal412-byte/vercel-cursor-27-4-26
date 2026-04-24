
-- Drop the overly permissive "Users can view comments" policy
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;

-- Replace with a policy that respects is_private
CREATE POLICY "Users can view comments" ON public.comments
FOR SELECT USING (
  is_private = false
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = comments.video_id
    AND v.user_id = auth.uid()
  )
);
