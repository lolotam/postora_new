-- Schedule daily token expiry notifications at 9 AM UTC
SELECT cron.schedule(
  'daily-token-expiry-notifications',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://efruibswazzuuupgyzmf.supabase.co/functions/v1/send-token-expiry-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);