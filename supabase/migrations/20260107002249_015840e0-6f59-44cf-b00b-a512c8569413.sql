-- Create user_quotas table
CREATE TABLE public.user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_profiles INTEGER DEFAULT 2,
  max_posts_per_month INTEGER DEFAULT 20,
  posts_this_month INTEGER DEFAULT 0,
  quota_reset_date TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Users can view their own quotas
CREATE POLICY "Users can view own quotas"
ON public.user_quotas
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all quotas
CREATE POLICY "Admins can manage quotas"
ON public.user_quotas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_quotas_updated_at
BEFORE UPDATE ON public.user_quotas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to also create quotas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Also create default quotas for new user
  INSERT INTO public.user_quotas (user_id, max_profiles, max_posts_per_month)
  VALUES (NEW.id, 2, 20);
  
  RETURN NEW;
END;
$$;

-- Create quotas for existing users who don't have them
INSERT INTO public.user_quotas (user_id, max_profiles, max_posts_per_month)
SELECT id, 2, 20
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_quotas)
ON CONFLICT (user_id) DO NOTHING;