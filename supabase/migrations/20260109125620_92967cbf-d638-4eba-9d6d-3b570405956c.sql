-- Add expires_at column to user_feature_overrides
ALTER TABLE public.user_feature_overrides
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_feature_overrides.expires_at IS 'When this override expires (null means never expires)';