-- Add Email Notifications and Weekly Summary as Feature Flags
-- These can be toggled on/off globally for all users in Admin Settings

-- Insert Email Notifications feature flag
INSERT INTO app_settings (key, value, description)
VALUES (
  'feature_email_notifications',
  'true',
  'Token expiry warnings, connection alerts & announcements'
)
ON CONFLICT (key) DO NOTHING;

-- Insert Weekly Summary feature flag
INSERT INTO app_settings (key, value, description)
VALUES (
  'feature_weekly_summary',
  'true',
  'Receive a weekly report of your activity'
)
ON CONFLICT (key) DO NOTHING;
