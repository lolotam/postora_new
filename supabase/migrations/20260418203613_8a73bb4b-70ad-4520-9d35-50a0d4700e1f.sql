-- 1. Default app setting for TikTok analytics source
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'tiktok_analytics_source',
  '"apify"'::jsonb,
  'Data source for TikTok analytics page: "apify" (scrape any public username) or "tiktok_api" (official API, connected accounts only)'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Cache table for TikTok API analytics responses
CREATE TABLE IF NOT EXISTS public.tiktok_api_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  social_account_id UUID NOT NULL,
  cache_key TEXT NOT NULL,
  profile_data JSONB,
  posts_data JSONB,
  cursor TEXT,
  has_more BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (social_account_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_cache_account ON public.tiktok_api_analytics_cache(social_account_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_cache_expires ON public.tiktok_api_analytics_cache(expires_at);

ALTER TABLE public.tiktok_api_analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tiktok cache"
  ON public.tiktok_api_analytics_cache FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own tiktok cache"
  ON public.tiktok_api_analytics_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tiktok cache"
  ON public.tiktok_api_analytics_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tiktok cache"
  ON public.tiktok_api_analytics_cache FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_tiktok_cache_updated_at
  BEFORE UPDATE ON public.tiktok_api_analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();