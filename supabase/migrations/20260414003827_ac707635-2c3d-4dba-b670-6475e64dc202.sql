
-- Quick reply usage tracking
CREATE TABLE public.whatsapp_quick_reply_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quick_reply_id UUID NOT NULL,
  conversation_id TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_quick_reply_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick reply usage"
  ON public.whatsapp_quick_reply_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quick reply usage"
  ON public.whatsapp_quick_reply_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_qr_usage_user ON public.whatsapp_quick_reply_usage(user_id);
CREATE INDEX idx_qr_usage_qr_id ON public.whatsapp_quick_reply_usage(quick_reply_id);

-- Auto reply usage tracking
CREATE TABLE public.whatsapp_auto_reply_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  auto_reply_rule_id UUID NOT NULL,
  conversation_id TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_auto_reply_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auto reply usage"
  ON public.whatsapp_auto_reply_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert auto reply usage"
  ON public.whatsapp_auto_reply_usage FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_ar_usage_user ON public.whatsapp_auto_reply_usage(user_id);
CREATE INDEX idx_ar_usage_rule ON public.whatsapp_auto_reply_usage(auto_reply_rule_id);
