CREATE POLICY "Admins can view all platform posts"
ON public.platform_posts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));