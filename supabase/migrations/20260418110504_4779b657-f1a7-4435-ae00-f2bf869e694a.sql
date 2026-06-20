INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('META_WHATSAPP_CONFIG_ID', '"1663110164872480"'::jsonb, 'Meta WhatsApp Embedded Signup Config ID (Cloud API)'),
  ('META_WHATSAPP_COEXISTENCE_CONFIG_ID', '"978825294740266"'::jsonb, 'Meta WhatsApp Embedded Signup Config ID (Coexistence)')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();