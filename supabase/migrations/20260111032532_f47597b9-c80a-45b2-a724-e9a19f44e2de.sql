-- =============================================
-- SECURITY FIX: Make media storage bucket private
-- =============================================

-- Update the storage bucket to be private
-- This prevents unauthorized access to user-uploaded media files
UPDATE storage.buckets 
SET public = false 
WHERE id = 'media';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;

-- The existing user-scoped policies for INSERT, SELECT, UPDATE, DELETE
-- are already properly configured to restrict access to each user's own folder.
-- These policies remain in place:
-- - "Users can upload their own media" (INSERT)
-- - "Users can view their own media" (SELECT) 
-- - "Users can update their own media" (UPDATE)
-- - "Users can delete their own media" (DELETE)

-- Note: For public media sharing, the application should use 
-- Supabase's createSignedUrl() function to generate temporary URLs
-- with short expiration times.