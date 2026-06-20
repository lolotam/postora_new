-- Add RLS policies to password_reset_otps table
-- This table stores OTP codes for password reset, access should be restricted

-- Allow service role to manage OTPs (for edge functions)
-- Block all direct user access - OTPs are managed via edge functions only

-- No SELECT policy for users - they shouldn't be able to query OTPs directly
-- The edge function uses service role key to verify OTPs

-- Allow cleanup function to delete expired OTPs
CREATE POLICY "Service role can manage password reset OTPs"
ON public.password_reset_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to see if they have pending OTPs (just existence check)
-- This is optional and can be removed if not needed
CREATE POLICY "Users cannot access OTPs directly"
ON public.password_reset_otps
FOR SELECT
TO authenticated, anon
USING (false);