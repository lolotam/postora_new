
-- Broadcast campaigns
CREATE TABLE public.whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_components JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'cancelled')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual recipient status
CREATE TABLE public.whatsapp_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_whatsapp_broadcasts_user_id ON public.whatsapp_broadcasts(user_id);
CREATE INDEX idx_whatsapp_broadcasts_status ON public.whatsapp_broadcasts(status);
CREATE INDEX idx_whatsapp_broadcast_recipients_broadcast_id ON public.whatsapp_broadcast_recipients(broadcast_id);
CREATE INDEX idx_whatsapp_broadcast_recipients_status ON public.whatsapp_broadcast_recipients(status);

-- RLS
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Broadcast policies
CREATE POLICY "Users can view own broadcasts"
  ON public.whatsapp_broadcasts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own broadcasts"
  ON public.whatsapp_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broadcasts"
  ON public.whatsapp_broadcasts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own broadcasts"
  ON public.whatsapp_broadcasts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recipient policies (join through broadcast to check ownership)
CREATE POLICY "Users can view recipients of own broadcasts"
  ON public.whatsapp_broadcast_recipients FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_broadcasts
    WHERE id = broadcast_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert recipients for own broadcasts"
  ON public.whatsapp_broadcast_recipients FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_broadcasts
    WHERE id = broadcast_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update recipients of own broadcasts"
  ON public.whatsapp_broadcast_recipients FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_broadcasts
    WHERE id = broadcast_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete recipients of own broadcasts"
  ON public.whatsapp_broadcast_recipients FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_broadcasts
    WHERE id = broadcast_id AND user_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER update_whatsapp_broadcasts_updated_at
  BEFORE UPDATE ON public.whatsapp_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
