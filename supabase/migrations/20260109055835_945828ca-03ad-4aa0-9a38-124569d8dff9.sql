-- Fix SECURITY DEFINER view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_social_accounts;

CREATE VIEW public.public_social_accounts 
WITH (security_invoker = true) AS
SELECT 
  sa.id, 
  sa.platform, 
  sa.platform_username, 
  sa.avatar_url, 
  sa.is_active, 
  sa.social_profile_id
FROM public.social_accounts sa
WHERE EXISTS (
  SELECT 1 FROM public.social_profiles sp 
  WHERE sp.id = sa.social_profile_id AND sp.is_public = true
);

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_social_accounts TO authenticated, anon;