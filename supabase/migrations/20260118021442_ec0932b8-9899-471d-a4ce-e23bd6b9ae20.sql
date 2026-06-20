-- ============================================
-- CANVAS WORKFLOW BUILDER DATABASE SCHEMA
-- ============================================

-- 1. WORKFLOWS TABLE - Core workflow storage
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. WORKFLOW EXECUTIONS - Track workflow runs
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  execution_summary JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workflow_executions_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- 3. NODE EXECUTION LOGS - Track individual node executions
CREATE TABLE public.node_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT node_execution_logs_status_check CHECK (status IN ('pending', 'running', 'success', 'error', 'skipped'))
);

-- 4. WORKFLOW VERSIONS - Version history for workflows
CREATE TABLE public.workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  viewport JSONB,
  change_description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version_number)
);

-- 5. WORKFLOW COMMENTS - Comments on workflows/nodes
CREATE TABLE public.workflow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  node_id TEXT,
  position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. WORKFLOW WEBHOOKS - Webhook triggers for workflows
CREATE TABLE public.workflow_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  webhook_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. WORKFLOW SCHEDULES - Scheduled workflow runs
CREATE TABLE public.workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. WORKFLOW TEMPLATES - Curated templates
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_image_url TEXT,
  use_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_is_template ON public.workflows(is_template) WHERE is_template = true;
CREATE INDEX idx_workflows_is_public ON public.workflows(is_public) WHERE is_public = true;
CREATE INDEX idx_workflows_created_at ON public.workflows(created_at DESC);

CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_at ON public.workflow_executions(created_at DESC);

CREATE INDEX idx_node_execution_logs_execution_id ON public.node_execution_logs(execution_id);
CREATE INDEX idx_node_execution_logs_status ON public.node_execution_logs(status);

CREATE INDEX idx_workflow_versions_workflow_id ON public.workflow_versions(workflow_id);

CREATE INDEX idx_workflow_webhooks_token ON public.workflow_webhooks(webhook_token);
CREATE INDEX idx_workflow_webhooks_workflow_id ON public.workflow_webhooks(workflow_id);

CREATE INDEX idx_workflow_schedules_workflow_id ON public.workflow_schedules(workflow_id);
CREATE INDEX idx_workflow_schedules_next_run ON public.workflow_schedules(next_run_at) WHERE is_active = true;

CREATE INDEX idx_workflow_templates_category ON public.workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_featured ON public.workflow_templates(is_featured) WHERE is_featured = true;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - WORKFLOWS
-- ============================================

CREATE POLICY "Users can view own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows"
  ON public.workflows FOR SELECT
  USING (is_public = true);

CREATE POLICY "Admins can view all workflows"
  ON public.workflows FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - WORKFLOW EXECUTIONS
-- ============================================

CREATE POLICY "Users can view own executions"
  ON public.workflow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all executions"
  ON public.workflow_executions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own executions"
  ON public.workflow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions"
  ON public.workflow_executions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert executions"
  ON public.workflow_executions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update executions"
  ON public.workflow_executions FOR UPDATE
  USING (true);

-- ============================================
-- RLS POLICIES - NODE EXECUTION LOGS
-- ============================================

CREATE POLICY "Users can view own node logs"
  ON public.node_execution_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflow_executions we
    WHERE we.id = execution_id AND we.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all node logs"
  ON public.node_execution_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage node logs"
  ON public.node_execution_logs FOR ALL
  USING (true);

-- ============================================
-- RLS POLICIES - WORKFLOW VERSIONS
-- ============================================

CREATE POLICY "Users can view own workflow versions"
  ON public.workflow_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflows w
    WHERE w.id = workflow_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own workflow versions"
  ON public.workflow_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workflows w
    WHERE w.id = workflow_id AND w.user_id = auth.uid()
  ));

-- ============================================
-- RLS POLICIES - WORKFLOW COMMENTS
-- ============================================

CREATE POLICY "Users can view own workflow comments"
  ON public.workflow_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workflows w
    WHERE w.id = workflow_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "Users can create comments on own workflows"
  ON public.workflow_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workflows w
    WHERE w.id = workflow_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own comments"
  ON public.workflow_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.workflow_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - WORKFLOW WEBHOOKS
-- ============================================

CREATE POLICY "Users can view own webhooks"
  ON public.workflow_webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON public.workflow_webhooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON public.workflow_webhooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON public.workflow_webhooks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - WORKFLOW SCHEDULES
-- ============================================

CREATE POLICY "Users can view own schedules"
  ON public.workflow_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON public.workflow_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.workflow_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.workflow_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - WORKFLOW TEMPLATES
-- ============================================

CREATE POLICY "Anyone can view active templates"
  ON public.workflow_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.workflow_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_comments_updated_at
  BEFORE UPDATE ON public.workflow_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION: Create workflow version on save
-- ============================================

CREATE OR REPLACE FUNCTION public.create_workflow_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_version_number INTEGER;
BEGIN
  -- Only create version if nodes or edges changed
  IF OLD.nodes IS DISTINCT FROM NEW.nodes OR OLD.edges IS DISTINCT FROM NEW.edges THEN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM public.workflow_versions
    WHERE workflow_id = NEW.id;
    
    -- Insert new version
    INSERT INTO public.workflow_versions (
      workflow_id, version_number, nodes, edges, viewport, created_by
    ) VALUES (
      NEW.id, v_version_number, OLD.nodes, OLD.edges, OLD.viewport, auth.uid()
    );
    
    -- Keep only last 20 versions
    DELETE FROM public.workflow_versions
    WHERE workflow_id = NEW.id
    AND version_number < v_version_number - 19;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_workflow_version_trigger
  AFTER UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_version();

-- ============================================
-- FUNCTION: Increment template use count
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_template_use_count(p_template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.workflow_templates
  SET use_count = use_count + 1
  WHERE id = p_template_id;
END;
$$;