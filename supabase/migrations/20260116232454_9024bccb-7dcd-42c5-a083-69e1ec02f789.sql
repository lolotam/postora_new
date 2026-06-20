-- Create table for per-user AI model overrides
CREATE TABLE public.user_ai_model_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_ai_model_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can manage all overrides
CREATE POLICY "Admins can manage user AI model overrides"
ON public.user_ai_model_overrides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Users can view their own override
CREATE POLICY "Users can view their own AI model override"
ON public.user_ai_model_overrides
FOR SELECT
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_ai_model_overrides_updated_at
BEFORE UPDATE ON public.user_ai_model_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for quick lookups
CREATE INDEX idx_user_ai_model_overrides_user_id ON public.user_ai_model_overrides(user_id);