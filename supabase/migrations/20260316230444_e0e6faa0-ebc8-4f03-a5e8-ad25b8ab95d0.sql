
-- Seed all feature flag rows into app_settings with their correct defaults.
-- ON CONFLICT DO NOTHING ensures we don't overwrite any existing values.

INSERT INTO public.app_settings (key, value, description)
VALUES
  ('feature_video_compress', 'true'::jsonb, 'Enable video compression'),
  ('feature_tiktok_transcode', 'true'::jsonb, 'Enable TikTok transcode'),
  ('feature_tiktok_precheck', 'false'::jsonb, 'Enable TikTok pre-check'),
  ('feature_image_crop', 'true'::jsonb, 'Enable image cropping'),
  ('feature_ai_caption', 'true'::jsonb, 'Enable AI caption generation'),
  ('feature_ai_hashtags', 'true'::jsonb, 'Enable AI hashtag suggestions'),
  ('feature_ai_thumbnails', 'true'::jsonb, 'Enable AI thumbnails'),
  ('feature_ai_image', 'true'::jsonb, 'Enable AI image generation'),
  ('feature_stock_upload', 'false'::jsonb, 'Enable stock upload'),
  ('feature_canvas', 'false'::jsonb, 'Enable canvas feature'),
  ('feature_title_required', 'false'::jsonb, 'Require title for media posts'),
  ('feature_media_counter', 'false'::jsonb, 'Show media counter'),
  ('feature_atlascloud_upscale', 'false'::jsonb, 'Enable AtlasCloud 4K upscaling'),
  ('feature_email_notifications', 'false'::jsonb, 'Enable email notifications'),
  ('feature_platform_access', 'true'::jsonb, 'Show Platform Access card on Profiles'),
  ('feature_free_platforms', 'true'::jsonb, 'Show Free Platforms grid'),
  ('feature_tiktok_oauth_debug', 'false'::jsonb, 'Show TikTok OAuth Debug panel'),
  ('feature_connection_troubleshooter', 'true'::jsonb, 'Show Connection Troubleshooter'),
  ('feature_weekly_summary', 'false'::jsonb, 'Enable weekly summary emails')
ON CONFLICT (key) DO NOTHING;

-- Also update the RLS policy to include feature_weekly_summary
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.app_settings;

CREATE POLICY "Anyone can read public settings"
ON public.app_settings
FOR SELECT
USING (
  key = ANY (
    ARRAY[
      'app_name'::text,
      'app_logo'::text,
      'app_favicon'::text,
      'default_plan'::text,
      'feature_video_compress'::text,
      'feature_tiktok_transcode'::text,
      'feature_tiktok_precheck'::text,
      'feature_image_crop'::text,
      'feature_ai_caption'::text,
      'feature_ai_hashtags'::text,
      'feature_ai_thumbnails'::text,
      'feature_ai_image'::text,
      'feature_stock_upload'::text,
      'feature_canvas'::text,
      'feature_title_required'::text,
      'feature_media_counter'::text,
      'feature_atlascloud_upscale'::text,
      'feature_email_notifications'::text,
      'feature_platform_access'::text,
      'feature_free_platforms'::text,
      'feature_tiktok_oauth_debug'::text,
      'feature_connection_troubleshooter'::text,
      'feature_weekly_summary'::text
    ]
  )
);
