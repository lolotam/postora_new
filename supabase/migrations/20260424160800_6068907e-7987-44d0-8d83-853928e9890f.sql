INSERT INTO public.app_settings (key, value, description)
VALUES
  ('feature_msg_threads', 'false'::jsonb,
   'Show Threads Mentions in the Messaging sidebar for non-admin users'),
  ('feature_comment_manager', 'false'::jsonb,
   'Show Comments Inbox in the Messaging sidebar for non-admin users')
ON CONFLICT (key) DO NOTHING;