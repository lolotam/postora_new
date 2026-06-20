-- Create cron job to process scheduled blog posts every minute
SELECT cron.schedule(
  'process-scheduled-blog-posts',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://efruibswazzuuupgyzmf.supabase.co/functions/v1/process-scheduled-blog-posts',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA'
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);