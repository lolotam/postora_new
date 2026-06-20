-- Threads recent searches: stores up to 10 newest keyword searches per user
CREATE TABLE public.threads_recent_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL,
  search_type text NOT NULL DEFAULT 'TOP',
  since_date date,
  until_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.threads_recent_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recent searches"
  ON public.threads_recent_searches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recent searches"
  ON public.threads_recent_searches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own recent searches"
  ON public.threads_recent_searches FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_threads_recent_searches_user_created
  ON public.threads_recent_searches (user_id, created_at DESC);