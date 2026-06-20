-- Create quotas for existing users who don't have one yet
INSERT INTO public.user_quotas (user_id, max_profiles, max_social_accounts, max_posts_per_month, posts_this_month, quota_reset_date)
SELECT 
  p.id as user_id,
  1 as max_profiles,
  4 as max_social_accounts, 
  30 as max_posts_per_month,
  0 as posts_this_month,
  (date_trunc('month', now()) + interval '1 month')::timestamp with time zone as quota_reset_date
FROM public.profiles p
LEFT JOIN public.user_quotas q ON p.id = q.user_id
WHERE q.id IS NULL;