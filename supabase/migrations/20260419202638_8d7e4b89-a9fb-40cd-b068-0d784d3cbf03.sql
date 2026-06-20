
CREATE TABLE public.caption_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caption TEXT NOT NULL,
  language TEXT,
  tone TEXT,
  platform TEXT,
  prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_caption_history_user_created ON public.caption_history (user_id, created_at DESC);

ALTER TABLE public.caption_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own caption history"
ON public.caption_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own caption history"
ON public.caption_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own caption history"
ON public.caption_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own caption history"
ON public.caption_history FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_caption_history_updated_at
BEFORE UPDATE ON public.caption_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
