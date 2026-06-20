-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily token refresh at 2:00 AM UTC
SELECT cron.schedule(
  'refresh-social-tokens-daily',
  '0 2 * * *', -- Every day at 2:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/refresh-tokens',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);