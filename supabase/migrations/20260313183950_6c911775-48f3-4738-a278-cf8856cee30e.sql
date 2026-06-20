-- Add ig_auth_type column to differentiate Instagram connection methods
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS ig_auth_type TEXT DEFAULT 'facebook_page';

-- Backfill existing Instagram accounts
UPDATE public.social_accounts
  SET ig_auth_type = 'facebook_page'
  WHERE platform = 'instagram' AND ig_auth_type IS NULL;