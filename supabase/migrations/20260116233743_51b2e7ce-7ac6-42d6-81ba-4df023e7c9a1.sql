-- Schedule daily cron job to notify admins about expiring AI model overrides
-- Runs every day at 9:00 AM UTC
SELECT cron.schedule(
  'notify-expiring-ai-overrides-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://b52780c5-cd0a-406b-a6a2-d9724d901b18.functions.supabase.co/notify-expiring-ai-overrides',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('source', 'cron', 'timestamp', now())
  ) AS request_id;
  $$
);