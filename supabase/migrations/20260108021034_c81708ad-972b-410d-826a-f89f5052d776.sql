-- Drop the existing platform check constraint
ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_platform_check;

-- Create a new check constraint that includes all supported platforms
ALTER TABLE public.social_accounts 
ADD CONSTRAINT social_accounts_platform_check 
CHECK (platform = ANY (ARRAY['facebook', 'instagram', 'tiktok', 'twitter', 'linkedin', 'youtube', 'pinterest', 'threads', 'bluesky']));