CREATE TABLE public.whatsapp_auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('away', 'keyword')),
  keywords TEXT[],
  reply_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  schedule_start TIME,
  schedule_end TIME,
  schedule_days INTEGER[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own auto replies"
  ON public.whatsapp_auto_replies FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_whatsapp_auto_replies_updated_at
  BEFORE UPDATE ON public.whatsapp_auto_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();