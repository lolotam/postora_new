-- Deactivate orphaned social accounts where:
-- 1. The linked profile doesn't exist, OR
-- 2. The linked profile belongs to a different user
UPDATE social_accounts sa
SET is_active = false
WHERE sa.is_active = true
  AND sa.social_profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM social_profiles sp 
    WHERE sp.id = sa.social_profile_id 
    AND sp.user_id = sa.user_id
  );