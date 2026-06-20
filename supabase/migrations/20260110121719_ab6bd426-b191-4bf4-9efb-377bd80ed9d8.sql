-- Add UPDATE policy for media_files so users can update their own files (e.g., move to different folder)
CREATE POLICY "Users can update own media files" 
ON public.media_files 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);