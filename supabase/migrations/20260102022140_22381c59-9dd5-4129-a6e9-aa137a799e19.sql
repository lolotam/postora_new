-- Add AI model preference to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'google/gemini-2.5-flash';