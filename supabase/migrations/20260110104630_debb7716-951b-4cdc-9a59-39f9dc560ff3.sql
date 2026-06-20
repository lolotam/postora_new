-- Add cloudinary_public_id column to media_files table for Cloudinary integration
ALTER TABLE public.media_files 
ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

-- Add index for faster lookups by cloudinary_public_id
CREATE INDEX IF NOT EXISTS idx_media_files_cloudinary_public_id 
ON public.media_files(cloudinary_public_id) 
WHERE cloudinary_public_id IS NOT NULL;