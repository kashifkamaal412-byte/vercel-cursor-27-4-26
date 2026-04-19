
-- Posts table for photo/text posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  image_url text,
  location text,
  tags text[],
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  gift_count integer DEFAULT 0,
  is_public boolean DEFAULT true,
  allow_comments boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read public posts
CREATE POLICY "Anyone can view public posts"
  ON public.posts FOR SELECT
  USING (is_public = true);

-- Users can view their own posts
CREATE POLICY "Users can view own posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create posts
CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own posts
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete own posts
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post likes table
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post comments table
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post comments"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create post comments"
  ON public.post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post comments"
  ON public.post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
