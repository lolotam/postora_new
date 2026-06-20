-- Update notification defaults to be OFF by default
-- This only affects NEW users; existing users keep their current settings

-- Change default for notification_sound_enabled to false
ALTER TABLE profiles 
ALTER COLUMN notification_sound_enabled SET DEFAULT false;

-- Change default for email_notifications_enabled to false
ALTER TABLE profiles 
ALTER COLUMN email_notifications_enabled SET DEFAULT false;

-- Add new notification preference columns for post success/failure
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS post_success_notifications_enabled BOOLEAN DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS post_failure_notifications_enabled BOOLEAN DEFAULT false;

-- Add comment explaining the default behavior
COMMENT ON COLUMN profiles.notification_sound_enabled IS 'Play sounds when posts publish or fail - OFF by default until user enables';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Token expiry warnings, connection alerts & announcements - OFF by default until user enables';
COMMENT ON COLUMN profiles.post_success_notifications_enabled IS 'Get notified when posts are published - OFF by default until user enables';
COMMENT ON COLUMN profiles.post_failure_notifications_enabled IS 'Get notified when posts fail - OFF by default until user enables';
