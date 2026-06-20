-- Allow logged-in users to read the non-secret WhatsApp Embedded Signup settings needed by the browser-side Meta SDK.
-- These are configuration IDs/status flags only, not app secrets or access tokens.
DROP POLICY IF EXISTS "Authenticated can read public settings" ON public.app_settings;

CREATE POLICY "Authenticated can read public settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  key = ANY (
    ARRAY[
      'app_name'::text,
      'app_logo'::text,
      'app_favicon'::text,
      'default_plan'::text,
      'feature_flag_categories'::text,
      'META_WHATSAPP_CONFIG_ID'::text,
      'META_WHATSAPP_COEXISTENCE_CONFIG_ID'::text,
      'WHATSAPP_TP_STATUS'::text
    ]
  )
  OR key ~~ like_escape('feature\_%'::text, '\'::text)
);