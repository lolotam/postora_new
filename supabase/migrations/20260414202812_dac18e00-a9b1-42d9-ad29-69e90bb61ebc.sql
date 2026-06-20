
CREATE TABLE public.comment_inbox_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  social_account_id UUID NOT NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL UNIQUE,
  author_name TEXT,
  author_id TEXT,
  message TEXT,
  sentiment TEXT,
  is_hidden BOOLEAN DEFAULT false,
  is_reply BOOLEAN DEFAULT false,
  parent_comment_id TEXT,
  comment_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comment_inbox_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own comments"
ON public.comment_inbox_cache FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comments"
ON public.comment_inbox_cache FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.comment_inbox_cache FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comment_inbox_cache FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all comments"
ON public.comment_inbox_cache FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_comment_inbox_cache_updated_at
BEFORE UPDATE ON public.comment_inbox_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_comment_inbox_user_platform ON public.comment_inbox_cache(user_id, platform);
CREATE INDEX idx_comment_inbox_post ON public.comment_inbox_cache(post_id);
