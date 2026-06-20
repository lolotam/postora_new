-- Create feature flag audit log table
CREATE TABLE public.feature_flag_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled flag changes table
CREATE TABLE public.feature_flag_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL,
  scheduled_value BOOLEAN NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flag_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log (admins only)
CREATE POLICY "Admins can view audit log"
  ON public.feature_flag_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit log"
  ON public.feature_flag_audit_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for schedules (admins only)
CREATE POLICY "Admins can manage schedules"
  ON public.feature_flag_schedules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_audit_log_feature_key ON public.feature_flag_audit_log(feature_key);
CREATE INDEX idx_audit_log_created_at ON public.feature_flag_audit_log(created_at DESC);
CREATE INDEX idx_schedules_status ON public.feature_flag_schedules(status) WHERE status = 'pending';
CREATE INDEX idx_schedules_scheduled_at ON public.feature_flag_schedules(scheduled_at) WHERE status = 'pending';