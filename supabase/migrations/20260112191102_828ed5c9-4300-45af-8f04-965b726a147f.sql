-- Create tier-based rate limit settings table
CREATE TABLE public.tier_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_slug TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  max_requests_per_hour INTEGER NOT NULL DEFAULT 10,
  max_requests_per_day INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_slug, endpoint)
);

-- Enable RLS
ALTER TABLE public.tier_rate_limits ENABLE ROW LEVEL SECURITY;

-- Admins can read tier limits
CREATE POLICY "Admins can manage tier rate limits"
ON public.tier_rate_limits
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- All authenticated users can read tier limits (for frontend display)
CREATE POLICY "Authenticated users can read tier limits"
ON public.tier_rate_limits
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_tier_rate_limits_updated_at
  BEFORE UPDATE ON public.tier_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tier limits for each plan and endpoint
-- Free tier (most restrictive)
INSERT INTO public.tier_rate_limits (plan_slug, endpoint, max_requests_per_hour, max_requests_per_day)
VALUES 
  ('free', 'generate-caption', 5, 20),
  ('free', 'generate-image', 2, 10),
  ('free', 'generate-hashtags', 10, 30);

-- Pro tier (moderate limits)
INSERT INTO public.tier_rate_limits (plan_slug, endpoint, max_requests_per_hour, max_requests_per_day)
VALUES 
  ('pro', 'generate-caption', 30, 150),
  ('pro', 'generate-image', 15, 75),
  ('pro', 'generate-hashtags', 50, 200);

-- Business tier (generous limits)
INSERT INTO public.tier_rate_limits (plan_slug, endpoint, max_requests_per_hour, max_requests_per_day)
VALUES 
  ('business', 'generate-caption', 100, 500),
  ('business', 'generate-image', 50, 250),
  ('business', 'generate-hashtags', 150, 600);

-- Add endpoint column to api_logs for daily tracking if not exists (it should exist already, adding comment)
-- The api_logs table already has the endpoint column which we'll use for both hourly and daily tracking