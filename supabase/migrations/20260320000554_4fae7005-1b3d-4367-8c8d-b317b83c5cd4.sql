-- Update the public read policy for app_settings to include new FB/IG posting feature flags
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
    'feature_fb_post_type'::text,
    'feature_fb_location'::text,
    'feature_fb_first_comment'::text,
    'feature_fb_link'::text,
    'feature_fb_share_to_story'::text,
    'feature_ig_post_type'::text,
    'feature_ig_location'::text,
    'feature_ig_first_comment'::text,
    'feature_ig_collaborator'::text,
    'feature_ig_advanced_settings'::text
  ]))
  OR (SELECT has_role(auth.uid(), 'admin'::app_role))
);