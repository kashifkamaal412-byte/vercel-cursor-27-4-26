CREATE TABLE public.render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  render_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own render jobs"
  ON public.render_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own render jobs"
  ON public.render_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);