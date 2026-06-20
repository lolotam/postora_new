-- Add folder column to media_files for organization
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '/';

-- Create index for folder filtering
CREATE INDEX IF NOT EXISTS idx_media_files_folder_path ON public.media_files(folder_path);

-- Create a table to store user folders
CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_path TEXT DEFAULT '/',
  full_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, full_path)
);

-- Enable RLS
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for media_folders
CREATE POLICY "Users can view their own folders"
ON public.media_folders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
ON public.media_folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.media_folders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.media_folders
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster folder lookups
CREATE INDEX IF NOT EXISTS idx_media_folders_user_path ON public.media_folders(user_id, parent_path);