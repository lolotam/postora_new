-- Seed default feature flag categories
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'feature_flag_categories',
  '{"feature_video_compress":"Media","feature_tiktok_transcode":"Media","feature_tiktok_precheck":"Media","feature_image_crop":"Media","feature_stock_upload":"Media","feature_media_counter":"Media","feature_ai_caption":"AI","feature_ai_hashtags":"AI","feature_ai_thumbnails":"AI","feature_ai_image":"AI","feature_atlascloud_upscale":"AI","feature_instagram_via_facebook":"Social","feature_reuse_post_data":"Social","feature_platform_access":"Social","feature_free_platforms":"Social","feature_canvas":"UI","feature_title_required":"UI","feature_email_notifications":"Notifications","feature_weekly_summary":"Notifications","feature_tiktok_oauth_debug":"Debug","feature_connection_troubleshooter":"Debug"}'::jsonb,
  'Maps feature flag keys to category names for admin UI grouping'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Update the RLS SELECT policy to include feature_flag_categories in public-readable keys
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.app_settings;
CREATE POLICY "Anyone can read public settings" ON public.app_settings
  FOR SELECT
  USING (
    key IN (
      'app_name', 'app_logo', 'app_favicon',
      'feature_platform_access', 'feature_free_platforms',
      'feature_tiktok_oauth_debug', 'feature_connection_troubleshooter',
      'feature_flag_categories'
    )
    OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
  );