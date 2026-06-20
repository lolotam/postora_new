-- Insert AI image generator feature flag
INSERT INTO app_settings (key, value, description)
VALUES ('feature_ai_image', 'true', 'Enable AI image generation for posts')
ON CONFLICT (key) DO NOTHING;

-- Create user feature overrides table
CREATE TABLE public.user_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own overrides
CREATE POLICY "Users can view their own feature overrides"
ON public.user_feature_overrides
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all overrides
CREATE POLICY "Admins can manage all feature overrides"
ON public.user_feature_overrides
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_user_feature_overrides_user_id ON public.user_feature_overrides(user_id);
CREATE INDEX idx_user_feature_overrides_feature_key ON public.user_feature_overrides(feature_key);

-- Add trigger for updated_at
CREATE TRIGGER update_user_feature_overrides_updated_at
  BEFORE UPDATE ON public.user_feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();