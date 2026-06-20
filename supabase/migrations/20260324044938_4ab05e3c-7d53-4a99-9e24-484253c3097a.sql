CREATE TABLE public.oauth_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id text NOT NULL,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  description text,
  icon_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.oauth_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage oauth_apps"
  ON public.oauth_apps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_oauth_apps_updated_at
  BEFORE UPDATE ON public.oauth_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.oauth_apps (name, client_id, redirect_uris, description)
VALUES ('n8n', '5b44c1b1-b9d5-4a35-9ca8-7e5944efb68c', 
  ARRAY['https://oauth.n8n.io/oauth2/callback', 'https://n8n.walidmohamed.com/rest/oauth2-credential/callback'],
  'n8n workflow automation - cloud and self-hosted');