-- =====================================================================
-- V1 Threads Mentions: create public.threads_mentions
-- Idempotent migration. Safe to re-run.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.threads_mentions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id        UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  threads_media_id         TEXT,
  mention_id               TEXT NOT NULL,
  mention_author_id        TEXT,
  mention_author_username  TEXT,
  mention_text             TEXT,
  mention_permalink        TEXT,
  mentioned_at             TIMESTAMPTZ,
  status                   TEXT NOT NULL DEFAULT 'new',
  raw_response             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'threads_mentions_status_check'
      AND conrelid = 'public.threads_mentions'::regclass
  ) THEN
    ALTER TABLE public.threads_mentions
      ADD CONSTRAINT threads_mentions_status_check
      CHECK (status IN ('new', 'read', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'threads_mentions_account_mention_unique'
      AND conrelid = 'public.threads_mentions'::regclass
  ) THEN
    ALTER TABLE public.threads_mentions
      ADD CONSTRAINT threads_mentions_account_mention_unique
      UNIQUE (social_account_id, mention_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_threads_mentions_user_id
  ON public.threads_mentions (user_id);
CREATE INDEX IF NOT EXISTS idx_threads_mentions_social_account_id
  ON public.threads_mentions (social_account_id);
CREATE INDEX IF NOT EXISTS idx_threads_mentions_status
  ON public.threads_mentions (status);
CREATE INDEX IF NOT EXISTS idx_threads_mentions_mentioned_at_desc
  ON public.threads_mentions (mentioned_at DESC);

ALTER TABLE public.threads_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own threads mentions"   ON public.threads_mentions;
DROP POLICY IF EXISTS "Users can insert own threads mentions" ON public.threads_mentions;
DROP POLICY IF EXISTS "Users can update own threads mentions" ON public.threads_mentions;
DROP POLICY IF EXISTS "Users can delete own threads mentions" ON public.threads_mentions;
DROP POLICY IF EXISTS "Admins can manage all threads mentions" ON public.threads_mentions;

CREATE POLICY "Users can view own threads mentions"
  ON public.threads_mentions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own threads mentions"
  ON public.threads_mentions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads mentions"
  ON public.threads_mentions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads mentions"
  ON public.threads_mentions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all threads mentions"
  ON public.threads_mentions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS set_threads_mentions_updated_at ON public.threads_mentions;
CREATE TRIGGER set_threads_mentions_updated_at
  BEFORE UPDATE ON public.threads_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();