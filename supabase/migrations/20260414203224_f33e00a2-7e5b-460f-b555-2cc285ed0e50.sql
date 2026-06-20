
CREATE TABLE public.lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  social_account_id UUID NOT NULL,
  page_id TEXT NOT NULL,
  form_id TEXT NOT NULL UNIQUE,
  form_name TEXT,
  form_status TEXT DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lead forms" ON public.lead_forms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lead forms" ON public.lead_forms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lead forms" ON public.lead_forms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lead forms" ON public.lead_forms FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all lead forms" ON public.lead_forms FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lead_forms_updated_at BEFORE UPDATE ON public.lead_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_lead_forms_user ON public.lead_forms(user_id);

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  form_id UUID REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  meta_lead_id TEXT UNIQUE,
  lead_data JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'new',
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_leads_form ON public.leads(form_id);
CREATE INDEX idx_leads_status ON public.leads(status);
