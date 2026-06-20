-- Fix existing TikTok account with correct username (handle) instead of display name
UPDATE social_accounts 
SET 
  platform_username = 'nonywaleed.tam201',
  account_metadata = jsonb_build_object(
    'tiktok_username', 'nonywaleed.tam201',
    'display_name', platform_username,
    'open_id', platform_user_id
  )
WHERE platform = 'tiktok' 
  AND id = '46d6ff21-8aa9-454f-b369-728f80a1b6df';