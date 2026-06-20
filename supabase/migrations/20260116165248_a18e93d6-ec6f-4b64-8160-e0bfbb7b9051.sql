-- Make email-attachments bucket public for download links
UPDATE storage.buckets 
SET public = true 
WHERE id = 'email-attachments';