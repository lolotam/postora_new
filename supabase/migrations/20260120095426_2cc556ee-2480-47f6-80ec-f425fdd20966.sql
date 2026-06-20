-- Insert the canvas feature flag into app_settings if it doesn't exist
INSERT INTO public.app_settings (key, value, description)
VALUES ('feature_canvas', 'true', 'Show Canvas feature in the header navigation')
ON CONFLICT (key) DO NOTHING;