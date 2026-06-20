
-- ============================================================
-- SECURITY FIX: Enable RLS on brand_scrape_cache
-- ============================================================
ALTER TABLE public.brand_scrape_cache ENABLE ROW LEVEL SECURITY;

-- brand_scrape_cache is populated by the brand-scrape edge function via service role.
-- Service role bypasses RLS, so no INSERT policy is needed for it.
-- Users should only read cache entries (read-only optimization layer).
CREATE POLICY "Authenticated users can read cache"
  ON public.brand_scrape_cache FOR SELECT
  TO authenticated
  USING (true);

-- Only service role (edge functions) can insert/update/delete
-- No policy needed since service role bypasses RLS automatically.

-- ============================================================
-- SECURITY FIX: Drop overly permissive INSERT policies
-- ============================================================

-- system_logs: already dropped in prior migration, but ensure no open policy exists
DROP POLICY IF EXISTS "System can insert system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Anyone can insert system logs" ON public.system_logs;

-- token_refresh_history: service role inserts bypass RLS, drop the open policy
DROP POLICY IF EXISTS "Service role can insert refresh history" ON public.token_refresh_history;

-- workflow_executions: keep user-scoped insert, drop the open one
DROP POLICY IF EXISTS "Service role can insert executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Service role can update executions" ON public.workflow_executions;

-- ============================================================
-- SECURITY FIX: Function search_path for all functions missing it
-- ============================================================

ALTER FUNCTION public.render_email_template(text, jsonb) SET search_path = public;
ALTER FUNCTION public.log_email_sent(text, text, uuid, text, text) SET search_path = public;
ALTER FUNCTION public.update_email_status(text, text, text) SET search_path = public;
ALTER FUNCTION public.update_coupons_updated_at() SET search_path = public;
ALTER FUNCTION public.is_coupon_valid(text, uuid) SET search_path = public;
ALTER FUNCTION public.get_coupon_stats(uuid) SET search_path = public;
ALTER FUNCTION public.redeem_coupon(text, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.get_email_stats(integer) SET search_path = public;
ALTER FUNCTION public.update_tickets_updated_at() SET search_path = public;
ALTER FUNCTION public.create_support_ticket(text, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.add_ticket_message(uuid, text, jsonb, boolean) SET search_path = public;
ALTER FUNCTION public.update_ticket_status(uuid, text) SET search_path = public;
ALTER FUNCTION public.assign_ticket(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_my_notifications(boolean, integer) SET search_path = public;
ALTER FUNCTION public.mark_notification_read(uuid) SET search_path = public;
ALTER FUNCTION public.mark_notification_dismissed(uuid) SET search_path = public;
ALTER FUNCTION public.mark_all_notifications_read() SET search_path = public;
ALTER FUNCTION public.toggle_checklist_item(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.get_checklist_progress() SET search_path = public;
ALTER FUNCTION public.get_latest_health_snapshot() SET search_path = public;
ALTER FUNCTION public.get_system_logs_filtered(text, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.get_health_history(integer) SET search_path = public;
ALTER FUNCTION public.get_edge_function_statuses() SET search_path = public;
ALTER FUNCTION public.get_notification_stats(uuid) SET search_path = public;
ALTER FUNCTION public.log_system_event(text, text, text, jsonb, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.calculate_health_score(numeric, numeric, integer, numeric) SET search_path = public;
ALTER FUNCTION public.cleanup_old_health_data() SET search_path = public;
