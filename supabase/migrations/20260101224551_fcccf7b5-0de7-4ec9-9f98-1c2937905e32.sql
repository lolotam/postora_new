-- Create social_profiles table for grouping social accounts
CREATE TABLE public.social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_profile_name_per_user UNIQUE (user_id, name)
);

-- Enable RLS
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own social profiles"
ON public.social_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social profiles"
ON public.social_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social profiles"
ON public.social_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social profiles"
ON public.social_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_social_profiles_updated_at
  BEFORE UPDATE ON public.social_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add social_profile_id to social_accounts (nullable for migration)
ALTER TABLE public.social_accounts 
ADD COLUMN social_profile_id UUID REFERENCES public.social_profiles(id) ON DELETE CASCADE;