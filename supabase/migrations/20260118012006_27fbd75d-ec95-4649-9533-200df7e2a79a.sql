-- Create token refresh history table
CREATE TABLE public.token_refresh_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_username TEXT,
  status TEXT NOT NULL, -- 'refreshed', 'failed', 'skipped', 'already_refreshed', 'cooldown', 'needs_reauth'
  error_message TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'cron', -- 'cron', 'manual', 'force'
  cron_category TEXT, -- 'short', 'medium', 'long' for scheduled runs
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_token_refresh_history_created_at ON public.token_refresh_history(created_at DESC);
CREATE INDEX idx_token_refresh_history_account_id ON public.token_refresh_history(account_id);
CREATE INDEX idx_token_refresh_history_status ON public.token_refresh_history(status);
CREATE INDEX idx_token_refresh_history_platform ON public.token_refresh_history(platform);

-- Enable RLS
ALTER TABLE public.token_refresh_history ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all history
CREATE POLICY "Admins can view all refresh history"
  ON public.token_refresh_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to insert (for edge functions)
CREATE POLICY "Service role can insert refresh history"
  ON public.token_refresh_history
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.token_refresh_history IS 'Logs all token refresh attempts for monitoring and debugging';