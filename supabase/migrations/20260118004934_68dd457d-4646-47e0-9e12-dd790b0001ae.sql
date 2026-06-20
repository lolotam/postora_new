-- Create separate cron jobs for different platform token refresh schedules
-- Short-lived platforms (Twitter, YouTube, Reddit, Bluesky) - every 30 minutes
-- Medium-lived platforms (TikTok, Pinterest) - hourly (same as existing)
-- Long-lived platforms (Facebook, Instagram, Threads, LinkedIn) - every 6 hours

-- First, remove the existing unified hourly cron job
SELECT cron.unschedule('refresh-social-tokens-hourly');

-- Create cron job for short-lived token platforms (every 30 minutes)
SELECT cron.schedule(
  'refresh-tokens-short-lived',
  '*/30 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/refresh-tokens',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA"}'::jsonb,
        body:='{"scheduled": true, "platforms": ["twitter", "youtube", "reddit", "bluesky"]}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job for medium-lived token platforms (every hour at minute 15)
SELECT cron.schedule(
  'refresh-tokens-medium-lived',
  '15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/refresh-tokens',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA"}'::jsonb,
        body:='{"scheduled": true, "platforms": ["tiktok", "pinterest"]}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job for long-lived token platforms (every 6 hours at minute 30)
SELECT cron.schedule(
  'refresh-tokens-long-lived',
  '30 */6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/refresh-tokens',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA"}'::jsonb,
        body:='{"scheduled": true, "platforms": ["facebook", "instagram", "threads", "linkedin"]}'::jsonb
    ) as request_id;
  $$
);