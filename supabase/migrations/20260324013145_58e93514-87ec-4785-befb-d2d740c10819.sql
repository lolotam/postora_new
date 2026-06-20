-- Brand Intelligence tables

-- Cache table (no RLS - service role only)
CREATE TABLE IF NOT EXISTS brand_scrape_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  response_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_brand_scrape_cache_key ON brand_scrape_cache(cache_key);
CREATE INDEX idx_brand_scrape_cache_expires ON brand_scrape_cache(expires_at);

-- Sessions table (user search history)
CREATE TABLE IF NOT EXISTS brand_scrape_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  username TEXT NOT NULL,
  profile_data JSONB,
  posts_data JSONB,
  total_posts_fetched INTEGER DEFAULT 0,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE brand_scrape_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own brand sessions"
  ON brand_scrape_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_brand_sessions_user ON brand_scrape_sessions(user_id);

-- Generated content collections
CREATE TABLE IF NOT EXISTS generated_content_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  source_post_url TEXT,
  source_username TEXT,
  source_platform TEXT,
  source_caption TEXT,
  transcript TEXT,
  post_prompts JSONB DEFAULT '[]'::jsonb,
  image_prompts JSONB DEFAULT '[]'::jsonb,
  video_prompts JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'english',
  tone TEXT DEFAULT 'professional',
  target_platform TEXT DEFAULT 'instagram',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE generated_content_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content collections"
  ON generated_content_collections FOR ALL USING (auth.uid() = user_id);

-- Seed app_settings keys
INSERT INTO app_settings (key, value, description) VALUES
  ('transcription_primary_model', '"gpt-4o-mini-transcribe"', 'Primary STT model'),
  ('transcription_fallback_model', '"whisper-1"', 'Fallback STT model'),
  ('apify_enabled', 'true', 'Enable Apify scraping fallback'),
  ('brand_scrape_cache_ttl_minutes', '60', 'Cache TTL in minutes'),
  ('brand_scrape_max_posts', '50', 'Max posts per scrape')
ON CONFLICT (key) DO NOTHING;