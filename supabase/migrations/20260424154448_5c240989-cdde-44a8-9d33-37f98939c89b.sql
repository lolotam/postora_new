-- Replace the SELECT policy on app_settings with a future-proof one
-- that allows authenticated users to read all feature flags by pattern,
-- plus a small set of branding keys. Admin policy is untouched.

DROP POLICY IF EXISTS "Anyone can read public settings" ON public.app_settings;

CREATE POLICY "Authenticated can read public settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  key IN ('app_name', 'app_logo', 'app_favicon', 'default_plan', 'feature_flag_categories')
  OR key LIKE 'feature\_%' ESCAPE '\'
);
