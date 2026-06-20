-- Seed 10 new Connected Accounts feature flags into app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('feature_tab_facebook', '"true"', 'Show Facebook tab in Connected Accounts'),
  ('feature_tab_instagram', '"true"', 'Show Instagram tab in Connected Accounts'),
  ('feature_tab_threads', '"true"', 'Show Threads tab in Connected Accounts'),
  ('feature_tab_tiktok', '"true"', 'Show TikTok tab in Connected Accounts'),
  ('feature_tab_youtube', '"true"', 'Show YouTube tab in Connected Accounts'),
  ('feature_tab_linkedin', '"true"', 'Show LinkedIn tab in Connected Accounts'),
  ('feature_tab_twitter', '"true"', 'Show X (Twitter) tab in Connected Accounts'),
  ('feature_tab_pinterest', '"true"', 'Show Pinterest tab in Connected Accounts'),
  ('feature_tab_bluesky', '"true"', 'Show Bluesky tab in Connected Accounts'),
  ('feature_tab_reddit', '"true"', 'Show Reddit tab in Connected Accounts')
ON CONFLICT (key) DO NOTHING;

-- Update RLS policy to include new keys in public whitelist
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
    'feature_tab_reddit'::text
  ]))
  OR (SELECT has_role(auth.uid(), 'admin'::app_role))
);