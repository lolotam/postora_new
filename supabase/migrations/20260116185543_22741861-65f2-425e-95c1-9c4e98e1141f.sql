-- Add email and mobile columns to support_messages table
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT;

-- Make email required for new entries but allow null for existing
-- (We'll enforce this at the application level for new submissions)