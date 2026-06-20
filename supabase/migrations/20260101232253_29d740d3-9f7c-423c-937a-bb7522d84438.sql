-- Add share_token to social_profiles for public sharing
ALTER TABLE public.social_profiles 
ADD COLUMN share_token uuid DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN is_public boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_social_profiles_share_token ON public.social_profiles(share_token) WHERE is_public = true;

-- Add RLS policy for public profile viewing
CREATE POLICY "Anyone can view public profiles by share token" 
ON public.social_profiles 
FOR SELECT 
USING (is_public = true);

-- Allow public viewing of social accounts linked to public profiles
CREATE POLICY "Anyone can view accounts of public profiles" 
ON public.social_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.social_profiles sp 
    WHERE sp.id = social_accounts.social_profile_id 
    AND sp.is_public = true
  )
);