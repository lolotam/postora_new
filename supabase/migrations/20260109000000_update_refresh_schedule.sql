-- Update the schedule of the token refresh job to run every hour instead of daily
-- This ensures tokens with short lifespans (or close to expiration) are caught in time.

SELECT cron.unschedule('refresh-social-tokens-daily');

SELECT cron.schedule(
  'refresh-social-tokens-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
        url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/refresh-tokens',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.anon_key', true) || '"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
