-- Create a system_logs table for tracking edge function executions and system events
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('auth', 'edge', 'database', 'token', 'post', 'system')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs(level);
CREATE INDEX idx_system_logs_category ON public.system_logs(category);
CREATE INDEX idx_system_logs_source ON public.system_logs(source);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins can read system logs"
ON public.system_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Service role can insert logs (from edge functions)
CREATE POLICY "Service role can insert logs"
ON public.system_logs
FOR INSERT
WITH CHECK (true);

-- Auto-delete logs older than 30 days (via cron job)
-- This keeps the table size manageable