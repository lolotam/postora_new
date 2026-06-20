-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all user_quotas
CREATE POLICY "Admins can view all user quotas"
ON public.user_quotas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));