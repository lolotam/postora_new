
-- Seed the feature_instagram_via_facebook flag (default: true)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'feature_instagram_via_facebook',
  'true',
  'When enabled, Facebook page connection can also discover/connect linked Instagram accounts. When disabled, Facebook connects pages only.'
)
ON CONFLICT (key) DO NOTHING;

-- Deduplicate existing Instagram accounts by normalized username per user.
-- For each (user_id, normalized_username) group with >1 row, keep the most recently updated one,
-- re-point platform_posts to it, and delete the rest.
DO $$
DECLARE
  r RECORD;
  kept_id UUID;
  dup_ids UUID[];
BEGIN
  FOR r IN
    SELECT user_id, LOWER(TRIM(BOTH FROM REPLACE(platform_username, '@', ''))) AS norm_username
    FROM public.social_accounts
    WHERE platform = 'instagram' AND is_active = true
    GROUP BY user_id, LOWER(TRIM(BOTH FROM REPLACE(platform_username, '@', '')))
    HAVING COUNT(*) > 1
  LOOP
    -- Pick the most recently updated row to keep
    SELECT id INTO kept_id
    FROM public.social_accounts
    WHERE user_id = r.user_id
      AND platform = 'instagram'
      AND is_active = true
      AND LOWER(TRIM(BOTH FROM REPLACE(platform_username, '@', ''))) = r.norm_username
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    -- Collect IDs of duplicates to remove
    SELECT ARRAY_AGG(id) INTO dup_ids
    FROM public.social_accounts
    WHERE user_id = r.user_id
      AND platform = 'instagram'
      AND is_active = true
      AND LOWER(TRIM(BOTH FROM REPLACE(platform_username, '@', ''))) = r.norm_username
      AND id != kept_id;

    -- Re-point platform_posts to the kept record
    IF dup_ids IS NOT NULL AND array_length(dup_ids, 1) > 0 THEN
      UPDATE public.platform_posts
      SET social_account_id = kept_id
      WHERE social_account_id = ANY(dup_ids);

      -- Delete duplicate rows
      DELETE FROM public.social_accounts
      WHERE id = ANY(dup_ids);

      RAISE NOTICE 'Merged % duplicate(s) for user % username % into %',
        array_length(dup_ids, 1), r.user_id, r.norm_username, kept_id;
    END IF;
  END LOOP;
END $$;
