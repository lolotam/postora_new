-- Add favicon URL setting with empty string default
INSERT INTO public.app_settings (key, value, description)
VALUES ('app_favicon', '""', 'Custom favicon URL for browser tab icon')
ON CONFLICT (key) DO NOTHING;