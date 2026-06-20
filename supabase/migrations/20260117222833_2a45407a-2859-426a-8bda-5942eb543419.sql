-- Create table for storing AI image generation reference presets
CREATE TABLE public.image_reference_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reference_images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.image_reference_presets ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own presets
CREATE POLICY "Users can view their own reference presets"
ON public.image_reference_presets
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to create their own presets
CREATE POLICY "Users can create their own reference presets"
ON public.image_reference_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own presets
CREATE POLICY "Users can update their own reference presets"
ON public.image_reference_presets
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy for users to delete their own presets
CREATE POLICY "Users can delete their own reference presets"
ON public.image_reference_presets
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups by user
CREATE INDEX idx_image_reference_presets_user_id ON public.image_reference_presets(user_id);

-- Create function for updating updated_at timestamp (reuse if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_image_reference_presets_updated_at
BEFORE UPDATE ON public.image_reference_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();