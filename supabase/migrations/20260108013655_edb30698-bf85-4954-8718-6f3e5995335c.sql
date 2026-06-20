-- Add preferred_timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_timezone TEXT DEFAULT NULL;