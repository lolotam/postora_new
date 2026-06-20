-- Fix RLS policies that use USING (true) or WITH CHECK (true)
-- These are flagged by the linter even though they're for service_role

-- 1. Fix admin_inbox_messages - Service role insert policy
DROP POLICY IF EXISTS "Service role can insert messages" ON public.admin_inbox_messages;

-- Service role policies don't actually need RLS checks because service_role bypasses RLS by default
-- The issue is that these policies were created FOR service_role but that role bypasses RLS
-- We should remove these redundant policies since service_role always bypasses RLS

-- 2. Fix password_reset_otps - Remove redundant service_role policy
DROP POLICY IF EXISTS "Service role can manage password reset OTPs" ON public.password_reset_otps;
-- Keep the deny policy for users
-- The service_role key in edge functions will bypass RLS automatically

-- 3. Fix system_logs - Service role insert policy  
DROP POLICY IF EXISTS "Service role can insert logs" ON public.system_logs;
-- Service role bypasses RLS, so this policy is redundant

-- Note: service_role always bypasses RLS by design in Supabase
-- These policies were incorrectly created thinking they were needed
-- Edge functions using SUPABASE_SERVICE_ROLE_KEY automatically bypass RLS