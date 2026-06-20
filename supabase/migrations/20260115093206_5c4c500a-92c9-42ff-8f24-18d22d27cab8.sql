-- Add TikTok sandbox mode setting
INSERT INTO app_settings (key, value, description)
VALUES 
  ('tiktok_sandbox_mode', 'true', 'Use TikTok Sandbox credentials instead of Production')
ON CONFLICT (key) DO NOTHING;