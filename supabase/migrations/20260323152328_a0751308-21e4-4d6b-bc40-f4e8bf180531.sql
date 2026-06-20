
CREATE TABLE public.log_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.system_logs(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  lovable_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(log_id)
);

ALTER TABLE public.log_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage log analyses"
  ON public.log_analyses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
