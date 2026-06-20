-- Add notification_sound_enabled column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_sound_enabled boolean DEFAULT true;