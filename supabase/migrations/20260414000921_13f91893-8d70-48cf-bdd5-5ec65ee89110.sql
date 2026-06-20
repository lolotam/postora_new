-- Add media columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS media_metadata JSONB;

-- media_url already exists, just ensure the new columns are added
-- Create index for quick media lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_media_type ON public.whatsapp_messages(media_type) WHERE media_type IS NOT NULL;