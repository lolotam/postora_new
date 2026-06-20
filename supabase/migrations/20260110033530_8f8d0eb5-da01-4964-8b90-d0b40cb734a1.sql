-- Make the media bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'media';