-- Create table for storing password reset OTPs securely
CREATE TABLE public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX idx_reset_otps_email ON public.password_reset_otps(email);

-- Index for cleanup of expired codes
CREATE INDEX idx_reset_otps_expires ON public.password_reset_otps(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- No direct access policies - only edge functions with service role can access
-- This is intentional for security

-- Function to cleanup expired/used OTPs (called periodically or on insert)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_otps 
  WHERE expires_at < now() OR used = true;
END;
$$;