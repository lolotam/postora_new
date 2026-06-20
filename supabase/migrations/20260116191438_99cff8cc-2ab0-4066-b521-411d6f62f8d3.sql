-- Add token health tracking columns to social_accounts
ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS needs_reauth boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS failure_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_refresh_error text,
ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS alerts_snoozed boolean DEFAULT false;

-- Add index for efficient querying of accounts needing attention
CREATE INDEX IF NOT EXISTS idx_social_accounts_needs_reauth ON public.social_accounts(needs_reauth) WHERE needs_reauth = true;
CREATE INDEX IF NOT EXISTS idx_social_accounts_failure_count ON public.social_accounts(failure_count) WHERE failure_count > 0;