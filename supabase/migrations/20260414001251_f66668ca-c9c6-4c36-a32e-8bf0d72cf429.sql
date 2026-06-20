-- Labels table
CREATE TABLE public.whatsapp_conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own labels" ON public.whatsapp_conversation_labels
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Label assignments junction table
CREATE TABLE public.whatsapp_conversation_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id TEXT NOT NULL,
  label_id UUID REFERENCES public.whatsapp_conversation_labels(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, label_id)
);

ALTER TABLE public.whatsapp_conversation_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own label assignments" ON public.whatsapp_conversation_label_assignments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_label_assignments_conv ON public.whatsapp_conversation_label_assignments(conversation_id);
CREATE INDEX idx_label_assignments_label ON public.whatsapp_conversation_label_assignments(label_id);