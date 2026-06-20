-- Add strategy_used and api_endpoint columns to brand_scrape_sessions
ALTER TABLE public.brand_scrape_sessions 
  ADD COLUMN IF NOT EXISTS strategy_used TEXT,
  ADD COLUMN IF NOT EXISTS api_endpoint TEXT;