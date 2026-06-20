
-- ============================================================
-- FIX: node_execution_logs - restrict "Service role" policy to service_role only
-- The current policy uses USING(true) on public role (includes anon)
-- ============================================================
DROP POLICY IF EXISTS "Service role can manage node logs" ON public.node_execution_logs;

-- ============================================================
-- FIX: user_credits - prevent users from updating their own balance
-- Users should only be able to read their credits, not modify them.
-- Credit changes should go through the add_user_credits / use_credits functions.
-- ============================================================
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- ============================================================
-- FIX: coupon_redemptions - drop open INSERT policy
-- Redemptions should only happen via the redeem_coupon SECURITY DEFINER function
-- ============================================================
DROP POLICY IF EXISTS "System can insert redemptions" ON public.coupon_redemptions;

-- ============================================================
-- FIX: ticket_activities - drop open INSERT policy
-- Activities are inserted via create_support_ticket/add_ticket_message SECURITY DEFINER functions
-- ============================================================
DROP POLICY IF EXISTS "System can insert activities" ON public.ticket_activities;

-- ============================================================
-- FIX: email_log - drop open INSERT policy
-- Logs are inserted via log_email_sent SECURITY DEFINER function
-- ============================================================
DROP POLICY IF EXISTS "System can insert logs" ON public.email_log;
