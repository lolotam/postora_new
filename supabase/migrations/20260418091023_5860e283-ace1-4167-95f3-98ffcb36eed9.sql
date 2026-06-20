INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('META_WHATSAPP_CONFIG_ID', '""'::jsonb, 'Meta Embedded Signup Configuration ID for WhatsApp Cloud API onboarding (mobile app disabled).'),
  ('META_WHATSAPP_COEXISTENCE_CONFIG_ID', '""'::jsonb, 'Meta Embedded Signup Configuration ID for WhatsApp Coexistence onboarding (mobile app stays active).')
ON CONFLICT (key) DO NOTHING;