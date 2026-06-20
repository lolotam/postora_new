-- Create observability metrics table for storing aggregated metrics
CREATE TABLE public.observability_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'edge_function', 'database', 'api', 'frontend', 'cron', 'token_health'
  metric_name TEXT NOT NULL, -- e.g., 'process-post', 'generate-caption', etc.
  metric_category TEXT NOT NULL DEFAULT 'general', -- 'error', 'performance', 'health', 'usage'
  
  -- Aggregated values for the time window
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms NUMERIC,
  max_duration_ms NUMERIC,
  min_duration_ms NUMERIC,
  
  -- Time window
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert configuration table
CREATE TABLE public.observability_alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Alert trigger configuration
  trigger_type TEXT NOT NULL, -- 'error_rate', 'response_time', 'function_failure', 'health_score', 'custom'
  metric_type TEXT, -- Optional: filter by metric type
  metric_name TEXT, -- Optional: filter by specific metric name
  
  -- Thresholds
  threshold_value NUMERIC NOT NULL, -- e.g., 5 for 5% error rate, 5000 for 5s response time
  threshold_operator TEXT NOT NULL DEFAULT 'gte', -- 'gt', 'gte', 'lt', 'lte', 'eq'
  time_window_minutes INTEGER NOT NULL DEFAULT 5, -- Evaluation window
  
  -- Notification settings
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['email'], -- 'email', 'in_app', 'webhook'
  notification_emails TEXT[] DEFAULT ARRAY['dr.vet.waleedtam@gmail.com'],
  webhook_url TEXT,
  
  -- Cooldown to prevent alert spam
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert history table
CREATE TABLE public.observability_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_config_id UUID REFERENCES public.observability_alert_configs(id) ON DELETE SET NULL,
  alert_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  
  -- Trigger details
  triggered_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  
  -- Context
  metric_type TEXT,
  metric_name TEXT,
  details JSONB DEFAULT '{}',
  
  -- Notification status
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_channel TEXT,
  notification_error TEXT,
  
  -- Resolution
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Severity
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system health snapshot table
CREATE TABLE public.observability_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Health scores (0-100)
  overall_health_score INTEGER NOT NULL,
  edge_functions_health INTEGER,
  database_health INTEGER,
  token_health INTEGER,
  cron_health INTEGER,
  
  -- Key metrics
  active_errors_count INTEGER NOT NULL DEFAULT 0,
  failed_functions_count INTEGER NOT NULL DEFAULT 0,
  slow_queries_count INTEGER NOT NULL DEFAULT 0,
  unhealthy_tokens_count INTEGER NOT NULL DEFAULT 0,
  
  -- Detailed breakdown
  metrics_breakdown JSONB DEFAULT '{}',
  
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.observability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observability_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observability_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observability_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage metrics"
ON public.observability_metrics
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alert configs"
ON public.observability_alert_configs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view alert history"
ON public.observability_alert_history
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view health snapshots"
ON public.observability_health_snapshots
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_metrics_type_name ON public.observability_metrics(metric_type, metric_name);
CREATE INDEX idx_metrics_window ON public.observability_metrics(window_start, window_end);
CREATE INDEX idx_alert_history_created ON public.observability_alert_history(created_at DESC);
CREATE INDEX idx_health_snapshots_captured ON public.observability_health_snapshots(captured_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_alert_configs_updated_at
BEFORE UPDATE ON public.observability_alert_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default alert configurations
INSERT INTO public.observability_alert_configs (name, description, trigger_type, threshold_value, threshold_operator, time_window_minutes, notification_emails, cooldown_minutes, is_active)
VALUES 
  ('High Error Rate', 'Alert when error rate exceeds 10% in 5 minutes', 'error_rate', 10, 'gte', 5, ARRAY['dr.vet.waleedtam@gmail.com'], 30, true),
  ('Slow Response Time', 'Alert when average response time exceeds 5 seconds', 'response_time', 5000, 'gte', 5, ARRAY['dr.vet.waleedtam@gmail.com'], 30, true),
  ('Function Failure', 'Alert on any edge function failure', 'function_failure', 1, 'gte', 1, ARRAY['dr.vet.waleedtam@gmail.com'], 15, true),
  ('Low Health Score', 'Alert when overall health drops below 70%', 'health_score', 70, 'lt', 10, ARRAY['dr.vet.waleedtam@gmail.com'], 60, true),
  ('Token Health Critical', 'Alert when token health drops below 60%', 'token_health', 60, 'lt', 10, ARRAY['dr.vet.waleedtam@gmail.com'], 60, true),
  ('Cron Job Failures', 'Alert when cron jobs fail', 'cron_failure', 1, 'gte', 5, ARRAY['dr.vet.waleedtam@gmail.com'], 30, true);