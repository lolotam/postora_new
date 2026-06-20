-- Insert feature flags for video compress and TikTok transcode
INSERT INTO app_settings (key, value, description)
VALUES 
  ('feature_video_compress', 'true', 'Enable video compression feature for users'),
  ('feature_tiktok_transcode', 'true', 'Enable TikTok video transcoding feature for users')
ON CONFLICT (key) DO NOTHING;