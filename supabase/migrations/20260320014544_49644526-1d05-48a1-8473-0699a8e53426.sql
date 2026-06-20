CREATE POLICY "Admins can view all media folders"
ON public.media_folders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));