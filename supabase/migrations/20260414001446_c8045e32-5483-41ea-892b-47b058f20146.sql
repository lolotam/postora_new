CREATE TABLE public.whatsapp_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_text TEXT,
  media_url TEXT,
  media_type TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled messages" ON public.whatsapp_scheduled_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_scheduled_msgs_status ON public.whatsapp_scheduled_messages(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_scheduled_msgs_user ON public.whatsapp_scheduled_messages(user_id);

CREATE TRIGGER update_scheduled_msgs_updated_at
  BEFORE UPDATE ON public.whatsapp_scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();