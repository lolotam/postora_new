-- Drop old check constraint and add whatsapp
ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_platform_check;
ALTER TABLE public.social_accounts ADD CONSTRAINT social_accounts_platform_check 
  CHECK (platform = ANY (ARRAY['facebook','instagram','tiktok','twitter','linkedin','youtube','pinterest','threads','bluesky','whatsapp','reddit']));

-- Insert WhatsApp Business account
INSERT INTO public.social_accounts (
  user_id,
  platform,
  platform_user_id,
  platform_username,
  access_token,
  is_active,
  social_profile_id,
  account_metadata,
  connected_at,
  updated_at
) VALUES (
  '7fe4d34e-1975-46fb-9dac-9c2df7a9eed6',
  'whatsapp',
  '1081875588344886',
  '+96566106604',
  '',
  true,
  '28395fcf-47fd-4ebf-8f7b-78d95ed1162a',
  '{"waba_id": "950316897704615", "display_phone": "+96566106604", "phone_number_id": "1081875588344886"}'::jsonb,
  now(),
  now()
) ON CONFLICT DO NOTHING;