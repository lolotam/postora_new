
CREATE TABLE public.oauth_redirect_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  oauth_app_id uuid REFERENCES public.oauth_apps(id) ON DELETE CASCADE NOT NULL,
  redirect_uri text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.oauth_redirect_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.oauth_redirect_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create requests"
  ON public.oauth_redirect_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access on redirect requests"
  ON public.oauth_redirect_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active oauth apps"
  ON public.oauth_apps FOR SELECT TO authenticated
  USING (is_active = true);
