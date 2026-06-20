-- Threads Reply Center cache table
CREATE TABLE public.threads_reply_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  reply_id TEXT NOT NULL,
  parent_id TEXT,
  root_post_id TEXT,
  username TEXT,
  text TEXT,
  permalink TEXT,
  timestamp TIMESTAMPTZ,
  media_type TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  has_replies BOOLEAN DEFAULT false,
  is_reply BOOLEAN DEFAULT true,
  is_reply_owned_by_me BOOLEAN DEFAULT false,
  hide_status TEXT,
  reply_audience TEXT,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','pending','approved','rejected')),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (social_account_id, reply_id)
);

CREATE INDEX idx_threads_reply_cache_user ON public.threads_reply_cache (user_id);
CREATE INDEX idx_threads_reply_cache_account_media ON public.threads_reply_cache (social_account_id, media_id);

ALTER TABLE public.threads_reply_cache ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can view their own reply cache"
  ON public.threads_reply_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reply cache"
  ON public.threads_reply_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reply cache"
  ON public.threads_reply_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reply cache"
  ON public.threads_reply_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Admin read-all
CREATE POLICY "Admins can view all reply cache"
  ON public.threads_reply_cache FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_threads_reply_cache_updated_at
BEFORE UPDATE ON public.threads_reply_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();