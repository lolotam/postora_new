-- Schedule the expiry reminder function to run daily at 9:00 AM UTC
-- Note: pg_cron and pg_net extensions must be enabled in Supabase Dashboard first
SELECT cron.schedule(
  'send-subscription-expiry-reminders',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/send-expiry-reminders',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MTk0MDQsImV4cCI6MjA2MjI5NTQwNH0.B0c37rV-jnPcL13tuFcaXo_f-epzsoE4_6C8cqDLCU0'
        ),
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);