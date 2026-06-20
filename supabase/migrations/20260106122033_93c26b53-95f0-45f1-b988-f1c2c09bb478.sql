-- Add source column to posts table to track where the post came from (manual or api)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_posts_source ON public.posts(source);