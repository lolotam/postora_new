-- Schedule weekly analytics summary email every Monday at 9 AM UTC
SELECT cron.schedule(
  'weekly-analytics-summary',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://efruibswazzuuupgyzmf.supabase.co/functions/v1/send-weekly-analytics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);