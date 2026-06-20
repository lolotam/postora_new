-- 1. Make the media storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'media';

-- 2. Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;

-- 3. Ensure user-scoped policies exist for proper access control
-- Users can view their own files
DROP POLICY IF EXISTS "Users can view own media" ON storage.objects;
CREATE POLICY "Users can view own media" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload own media" ON storage.objects;
CREATE POLICY "Users can upload own media" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
CREATE POLICY "Users can update own media" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
CREATE POLICY "Users can delete own media" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);