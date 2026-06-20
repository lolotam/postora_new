-- Update TikTok account to restore display_name and set proper handle
UPDATE public.social_accounts
SET 
  platform_username = '𝐻𝑎𝑛𝑜𝑛𝑎:)🌊',
  avatar_url = 'https://res.cloudinary.com/dur1soa8n/image/upload/v1768415779/avatars/7fe4d34e-1975-46fb-9dac-9c2df7a9eed6/tiktok_-000g6MVcNGAo5e9Hr3UZBOOcXKN5tL4UOK_.jpg',
  account_metadata = jsonb_build_object(
    'tiktok_username', 'nonywaleed.tam201',
    'display_name', '𝐻𝑎𝑛𝑜𝑛𝑎:)🌊',
    'open_id', '-000g6MVcNGAo5e9Hr3UZBOOcXKN5tL4UOK_'
  ),
  updated_at = now()
WHERE id = '46d6ff21-8aa9-454f-b369-728f80a1b6df';