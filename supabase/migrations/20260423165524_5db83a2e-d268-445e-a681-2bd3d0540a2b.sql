-- V2 Threads Mentions: extend table with engagement-inbox fields

-- 1. Add new columns (all additive, safe defaults)
ALTER TABLE public.threads_mentions
  ADD COLUMN IF NOT EXISTS has_reply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_text text,
  ADD COLUMN IF NOT EXISTS reply_platform_post_id text,
  ADD COLUMN IF NOT EXISTS reply_permalink text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_error text,
  ADD COLUMN IF NOT EXISTS sentiment text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- 2. Sentiment check constraint
DO $$ BEGIN
  ALTER TABLE public.threads_mentions
    ADD CONSTRAINT threads_mentions_sentiment_check
    CHECK (sentiment IN ('positive','neutral','negative','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Source check constraint
DO $$ BEGIN
  ALTER TABLE public.threads_mentions
    ADD CONSTRAINT threads_mentions_source_check
    CHECK (source IN ('manual','webhook'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Upgrade status check to include 'replied'
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.threads_mentions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%new%read%archived%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.threads_mentions DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  BEGIN
    ALTER TABLE public.threads_mentions
      ADD CONSTRAINT threads_mentions_status_check
      CHECK (status IN ('new','read','archived','replied'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 5. Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_threads_mentions_labels
  ON public.threads_mentions USING GIN (labels);

CREATE INDEX IF NOT EXISTS idx_threads_mentions_sentiment
  ON public.threads_mentions (sentiment);

CREATE INDEX IF NOT EXISTS idx_threads_mentions_assigned_to
  ON public.threads_mentions (assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_threads_mentions_has_reply
  ON public.threads_mentions (has_reply);

CREATE INDEX IF NOT EXISTS idx_threads_mentions_user_status
  ON public.threads_mentions (user_id, status);
