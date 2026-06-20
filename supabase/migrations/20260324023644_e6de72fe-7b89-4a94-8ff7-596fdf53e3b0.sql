INSERT INTO app_settings (key, value, description) VALUES
  ('apify_actor_instagram', '"apify/instagram-scraper"', 'Apify actor for Instagram scraping'),
  ('apify_actor_tiktok', '"clockworks/free-tiktok-scraper"', 'Apify actor for TikTok scraping'),
  ('apify_actor_facebook', '"apify/facebook-posts-scraper"', 'Apify actor for Facebook scraping'),
  ('apify_actor_threads', '"igview-owner/threads-post-scraper"', 'Apify actor for Threads scraping')
ON CONFLICT (key) DO NOTHING;