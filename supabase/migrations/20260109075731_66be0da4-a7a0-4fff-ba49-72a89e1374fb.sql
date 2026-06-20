-- Allow admins to view all social_accounts
CREATE POLICY "Admins can view all social accounts" 
ON public.social_accounts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all social_profiles
CREATE POLICY "Admins can view all social profiles" 
ON public.social_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all posts
CREATE POLICY "Admins can view all posts" 
ON public.posts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all quotas (ensure this exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_quotas' 
    AND policyname = 'Admins can view all user quotas'
  ) THEN
    CREATE POLICY "Admins can view all user quotas" 
    ON public.user_quotas 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;