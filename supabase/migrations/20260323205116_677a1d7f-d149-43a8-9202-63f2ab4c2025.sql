
CREATE TABLE IF NOT EXISTS public.provider_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provider_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage provider_api_keys"
  ON public.provider_api_keys
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
