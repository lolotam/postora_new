-- Allow all authenticated/public clients to read the visibility-related feature flags
-- so the Profiles page can respect admin toggles for all users.

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
      'feature_image_crop'::text,
      'feature_ai_caption'::text,
      'feature_ai_hashtags'::text,
      'feature_ai_thumbnails'::text,
      'feature_ai_image'::text,
      'feature_canvas'::text,
      'feature_title_required'::text,
      'feature_media_counter'::text,
      'feature_atlascloud_upscale'::text,
      'feature_email_notifications'::text,
      'feature_platform_access'::text,
      'feature_free_platforms'::text,
      'feature_tiktok_oauth_debug'::text,
      'feature_connection_troubleshooter'::text
    ]
  )
);