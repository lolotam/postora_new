-- Seed token column feature flags
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('feature_token_expires', '"true"', 'Show Token Expires column in Connected Accounts table'),
  ('feature_token_lifetime', '"true"', 'Show Token Lifetime column in Connected Accounts table')
ON CONFLICT (key) DO NOTHING;

-- Update RLS policy to include new keys
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.app_settings;

CREATE POLICY "Anyone can read public settings"
ON public.app_settings
FOR SELECT
TO public
USING (
  (key = ANY (ARRAY[
    'app_name'::text,
    'app_logo'::text,
    'app_favicon'::text,
    'feature_platform_access'::text,
    'feature_free_platforms'::text,
    'feature_tiktok_oauth_debug'::text,
    'feature_connection_troubleshooter'::text,
    'feature_flag_categories'::text,
    'feature_reuse_post_data'::text,
    'feature_instagram_via_facebook'::text,
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
    'feature_fb_post_type'::text,
    'feature_fb_location'::text,
    'feature_fb_first_comment'::text,
    'feature_fb_link'::text,
    'feature_fb_share_to_story'::text,
    'feature_ig_post_type'::text,
    'feature_ig_location'::text,
    'feature_ig_first_comment'::text,
    'feature_ig_collaborator'::text,
    'feature_ig_advanced_settings'::text,
    'feature_tab_facebook'::text,
    'feature_tab_instagram'::text,
    'feature_tab_threads'::text,
    'feature_tab_tiktok'::text,
    'feature_tab_youtube'::text,
    'feature_tab_linkedin'::text,
    'feature_tab_twitter'::text,
    'feature_tab_pinterest'::text,
    'feature_tab_bluesky'::text,
    'feature_tab_reddit'::text,
    'feature_token_expires'::text,
    'feature_token_lifetime'::text
  ]))
  OR (SELECT has_role(auth.uid(), 'admin'::app_role))
);