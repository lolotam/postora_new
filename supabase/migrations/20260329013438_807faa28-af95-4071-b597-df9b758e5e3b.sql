INSERT INTO app_settings (key, value, description)
VALUES ('feature_threads_share_to_ig', 'false'::jsonb, 'Enable Threads cross-share to Instagram Story feature')
ON CONFLICT (key) DO NOTHING;