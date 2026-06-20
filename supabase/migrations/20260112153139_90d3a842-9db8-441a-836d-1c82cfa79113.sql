-- Create table for global rate limit settings
CREATE TABLE public.rate_limit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  max_requests INTEGER NOT NULL DEFAULT 10,
  window_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for per-user rate limit overrides
CREATE TABLE public.user_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  max_requests INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL DEFAULT 60,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Insert default rate limit settings
INSERT INTO public.rate_limit_settings (endpoint, display_name, max_requests, window_minutes) VALUES
  ('generate-caption', 'AI Caption Generation', 20, 60),
  ('generate-image', 'AI Image Generation', 10, 60),
  ('generate-hashtags', 'AI Hashtag Generation', 30, 60),
  ('post-create', 'Post Creation', 60, 60);

-- Enable RLS
ALTER TABLE public.rate_limit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate_limit_settings (admins can manage, all authenticated users can read)
CREATE POLICY "Authenticated users can view rate limit settings"
  ON public.rate_limit_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rate limit settings"
  ON public.rate_limit_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_rate_limits (admins can manage, users can see their own)
CREATE POLICY "Users can view their own rate limits"
  ON public.user_rate_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user rate limits"
  ON public.user_rate_limits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user rate limits"
  ON public.user_rate_limits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_user_rate_limits_user_id ON public.user_rate_limits(user_id);
CREATE INDEX idx_user_rate_limits_endpoint ON public.user_rate_limits(endpoint);
CREATE INDEX idx_rate_limit_settings_endpoint ON public.rate_limit_settings(endpoint);

-- Add updated_at triggers
CREATE TRIGGER update_rate_limit_settings_updated_at
  BEFORE UPDATE ON public.rate_limit_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_rate_limits_updated_at
  BEFORE UPDATE ON public.user_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();