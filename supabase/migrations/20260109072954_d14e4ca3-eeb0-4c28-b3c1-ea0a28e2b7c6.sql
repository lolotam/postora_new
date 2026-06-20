-- Add max_social_accounts column to user_quotas table
ALTER TABLE public.user_quotas 
ADD COLUMN IF NOT EXISTS max_social_accounts integer DEFAULT 4;

-- Update default values for free tier: 1 profile, 4 social accounts, 30 posts/month
UPDATE public.user_quotas 
SET 
  max_profiles = 1,
  max_social_accounts = 4,
  max_posts_per_month = 30
WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

-- Create function to auto-create quota for new users with free tier defaults
CREATE OR REPLACE FUNCTION public.handle_new_user_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id, max_profiles, max_social_accounts, max_posts_per_month, posts_this_month, quota_reset_date)
  VALUES (
    NEW.id, 
    1, -- 1 profile for free tier
    4, -- 4 social accounts for free tier
    30, -- 30 posts per month for free tier
    0,
    (date_trunc('month', now()) + interval '1 month')::timestamptz
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create quota when new profile is created
DROP TRIGGER IF EXISTS on_profile_created_quota ON public.profiles;
CREATE TRIGGER on_profile_created_quota
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_quota();