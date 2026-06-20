-- Update existing TikTok account to use display_name for UI display
UPDATE public.social_accounts
SET 
  platform_username = COALESCE(
    (account_metadata->>'display_name'),
    platform_username
  ),
  account_metadata = jsonb_set(
    COALESCE(account_metadata, '{}'::jsonb),
    '{tiktok_username}',
    '"nonywaleed.tam201"'
  ),
  updated_at = now()
WHERE platform = 'tiktok'
  AND id = '46d6ff21-8aa9-454f-b369-728f80a1b6df';