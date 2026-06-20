-- Fix 1: whatsapp_auto_reply_usage open INSERT
DROP POLICY IF EXISTS "Service role can insert auto reply usage" ON public.whatsapp_auto_reply_usage;

-- Fix 2: realtime.messages unrestricted subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated realtime subscribe (admin-gated topics)" ON realtime.messages;
CREATE POLICY "Authenticated realtime subscribe (admin-gated topics)"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    CASE
      WHEN topic LIKE 'deployment_logs:%'
        OR topic LIKE 'admin_inbox_messages:%'
        OR topic LIKE 'system_logs:%'
        OR topic LIKE 'api_logs:%'
      THEN public.has_role(auth.uid(), 'admin'::app_role)
      ELSE true
    END
  );

-- Fix 3a: whatsapp_agents
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='whatsapp_agents' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.whatsapp_agents', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Read own agent profile" ON public.whatsapp_agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3b: whatsapp_conversation_assignments
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='whatsapp_conversation_assignments' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.whatsapp_conversation_assignments', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Read own conversation assignments" ON public.whatsapp_conversation_assignments
  FOR SELECT TO authenticated
  USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_agents a
      WHERE a.id = whatsapp_conversation_assignments.agent_id
        AND a.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix 3c: whatsapp_assignment_history
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='whatsapp_assignment_history' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.whatsapp_assignment_history', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Read own assignment history" ON public.whatsapp_assignment_history
  FOR SELECT TO authenticated
  USING (
    performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_agents a
      WHERE (a.id = whatsapp_assignment_history.from_agent_id
             OR a.id = whatsapp_assignment_history.to_agent_id)
        AND a.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix 4: ai_providers
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_providers' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.ai_providers', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Admins read AI providers" ON public.ai_providers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 5: brand_scrape_cache
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='brand_scrape_cache' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.brand_scrape_cache', r.policyname);
  END LOOP;
END $$;
-- No replacement: service role bypasses RLS; admins can be added later if needed.

-- Fix 6: system_settings
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='system_settings' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.system_settings', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Admins read system settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
