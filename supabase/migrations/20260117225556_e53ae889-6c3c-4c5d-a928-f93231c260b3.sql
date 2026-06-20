-- Create video processing presets table for saving crop + compress settings per platform
CREATE TABLE public.video_processing_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'tiktok', 'instagram', 'youtube', 'general'
  preset_type TEXT NOT NULL CHECK (preset_type IN ('crop', 'compress', 'both')),
  -- Crop settings (percentages 0-100 or aspect ratio)
  crop_aspect_ratio TEXT, -- e.g., '9:16', '1:1', '16:9'
  -- Compress settings
  compress_quality INTEGER CHECK (compress_quality IS NULL OR (compress_quality >= 10 AND compress_quality <= 100)),
  compress_max_size_mb INTEGER CHECK (compress_max_size_mb IS NULL OR compress_max_size_mb > 0),
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.video_processing_presets ENABLE ROW LEVEL SECURITY;

-- Users can only access their own presets
CREATE POLICY "Users can view their own presets"
ON public.video_processing_presets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets"
ON public.video_processing_presets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
ON public.video_processing_presets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
ON public.video_processing_presets FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_video_processing_presets_updated_at
BEFORE UPDATE ON public.video_processing_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_video_processing_presets_user_platform ON public.video_processing_presets(user_id, platform);