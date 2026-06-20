
-- Fix assignments INSERT policy
DROP POLICY "Authenticated users can create assignments" ON public.whatsapp_conversation_assignments;
CREATE POLICY "Agents can create assignments"
  ON public.whatsapp_conversation_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = assigned_by);

-- Fix assignments UPDATE policy  
DROP POLICY "Authenticated users can update assignments" ON public.whatsapp_conversation_assignments;
CREATE POLICY "Assigners can update assignments"
  ON public.whatsapp_conversation_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_by OR agent_id IN (SELECT id FROM public.whatsapp_agents WHERE user_id = auth.uid()));

-- Fix history INSERT policy
DROP POLICY "Authenticated users can create history" ON public.whatsapp_assignment_history;
CREATE POLICY "Users can create history entries"
  ON public.whatsapp_assignment_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = performed_by);
