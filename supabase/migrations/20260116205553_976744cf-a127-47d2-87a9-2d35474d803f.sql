-- Add unique constraint to prevent duplicate social accounts
-- This ensures only one row per user/platform/account combination at the database level
ALTER TABLE public.social_accounts 
ADD CONSTRAINT social_accounts_user_platform_unique 
UNIQUE (user_id, platform, platform_user_id);