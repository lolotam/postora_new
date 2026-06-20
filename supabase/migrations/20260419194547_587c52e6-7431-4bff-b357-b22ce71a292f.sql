ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_notified_pending
ON public.profiles (created_at)
WHERE admin_notified_at IS NULL;