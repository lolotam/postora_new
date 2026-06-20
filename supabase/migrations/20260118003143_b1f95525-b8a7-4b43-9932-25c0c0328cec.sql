-- Add last_refresh_attempt_at column to track when refresh was last attempted
-- This prevents concurrent refresh attempts from causing false failures

ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS last_refresh_attempt_at TIMESTAMPTZ;

-- Add an index for efficient querying during refresh operations
CREATE INDEX IF NOT EXISTS idx_social_accounts_last_refresh_attempt 
ON public.social_accounts(last_refresh_attempt_at) 
WHERE is_active = true AND needs_reauth = false;

-- Add a comment explaining the column's purpose
COMMENT ON COLUMN public.social_accounts.last_refresh_attempt_at IS 
'Timestamp of last token refresh attempt. Used to prevent concurrent refresh attempts and rate limiting.';