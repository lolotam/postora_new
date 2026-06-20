-- Create table for media operations history
CREATE TABLE public.media_operations_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_file_id UUID REFERENCES public.media_files(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL, -- 'background_removal', 'upscale', 'crop', 'resize', 'filter', 'compress', 'batch_rename', 'batch_tools'
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  source_url TEXT, -- Original file URL
  result_url TEXT, -- Processed result URL
  file_name TEXT, -- Original file name
  operation_details JSONB DEFAULT '{}', -- Details like scale factor, dimensions, filter settings
  error_message TEXT, -- Error message if failed
  duration_ms INTEGER, -- Processing duration in milliseconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX idx_media_operations_history_user_id ON public.media_operations_history(user_id);
CREATE INDEX idx_media_operations_history_created_at ON public.media_operations_history(created_at DESC);
CREATE INDEX idx_media_operations_history_operation_type ON public.media_operations_history(operation_type);
CREATE INDEX idx_media_operations_history_status ON public.media_operations_history(status);

-- Enable Row Level Security
ALTER TABLE public.media_operations_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own media operations history"
ON public.media_operations_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media operations"
ON public.media_operations_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media operations"
ON public.media_operations_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media operations history"
ON public.media_operations_history
FOR DELETE
USING (auth.uid() = user_id);

-- Allow admins to view all operations
CREATE POLICY "Admins can view all media operations history"
ON public.media_operations_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));