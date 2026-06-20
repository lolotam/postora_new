
-- Create whatsapp_message_templates table
CREATE TABLE public.whatsapp_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en_US',
  template_category TEXT NOT NULL DEFAULT 'UTILITY',
  template_status TEXT NOT NULL DEFAULT 'PENDING',
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta_template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own templates"
ON public.whatsapp_message_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.whatsapp_message_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.whatsapp_message_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.whatsapp_message_templates FOR DELETE
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update messaging_cache platform validation to include whatsapp
CREATE OR REPLACE FUNCTION public.validate_messaging_cache_platform()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.platform NOT IN ('facebook', 'instagram', 'whatsapp') THEN
    RAISE EXCEPTION 'platform must be facebook, instagram, or whatsapp';
  END IF;
  RETURN NEW;
END;
$function$;

-- Index for faster lookups
CREATE INDEX idx_whatsapp_templates_user ON public.whatsapp_message_templates(user_id);
CREATE INDEX idx_whatsapp_templates_account ON public.whatsapp_message_templates(social_account_id);
