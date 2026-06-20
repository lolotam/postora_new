-- Add platform and account tracking columns to media_files
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_account_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS upload_date DATE DEFAULT CURRENT_DATE;

-- Create index for filtering by date
CREATE INDEX IF NOT EXISTS idx_media_files_upload_date ON public.media_files(upload_date);

-- Create index for filtering by platforms
CREATE INDEX IF NOT EXISTS idx_media_files_platforms ON public.media_files USING GIN(platforms);

-- Create index for filtering by social account ids  
CREATE INDEX IF NOT EXISTS idx_media_files_social_account_ids ON public.media_files USING GIN(social_account_ids);