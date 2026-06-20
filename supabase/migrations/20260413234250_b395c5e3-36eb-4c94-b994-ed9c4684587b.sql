
-- Agents table
CREATE TABLE public.whatsapp_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  max_conversations INTEGER DEFAULT 10,
  current_conversations INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.whatsapp_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agents"
  ON public.whatsapp_agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own agent profile"
  ON public.whatsapp_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent profile"
  ON public.whatsapp_agents FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Conversation assignments
CREATE TABLE public.whatsapp_conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_active_assignment ON public.whatsapp_conversation_assignments(conversation_id) WHERE unassigned_at IS NULL;

ALTER TABLE public.whatsapp_conversation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON public.whatsapp_conversation_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create assignments"
  ON public.whatsapp_conversation_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments"
  ON public.whatsapp_conversation_assignments FOR UPDATE TO authenticated USING (true);

-- Assignment history
CREATE TABLE public.whatsapp_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('assigned', 'unassigned', 'transferred')),
  from_agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view history"
  ON public.whatsapp_assignment_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create history"
  ON public.whatsapp_assignment_history FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_whatsapp_agents_updated_at
  BEFORE UPDATE ON public.whatsapp_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_assignments_updated_at
  BEFORE UPDATE ON public.whatsapp_conversation_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
