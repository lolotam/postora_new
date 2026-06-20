CREATE POLICY "Admins can view all media files"
ON public.media_files
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));