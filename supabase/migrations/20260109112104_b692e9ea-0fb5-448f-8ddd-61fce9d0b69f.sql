-- Insert additional feature flags
INSERT INTO app_settings (key, value, description)
VALUES 
  ('feature_image_crop', 'true', 'Enable image cropping tool for users'),
  ('feature_ai_caption', 'true', 'Enable AI caption generation for posts'),
  ('feature_ai_hashtags', 'true', 'Enable AI hashtag suggestions'),
  ('feature_ai_thumbnails', 'true', 'Enable AI thumbnail generation for videos')
ON CONFLICT (key) DO NOTHING;