-- Update Free plan with daily limits and image tools
UPDATE subscription_plans 
SET 
  features = '["3 Connected Accounts", "2 Social Profiles", "30 Posts/Month", "1 Post/Day", "20 Media Uploads/Day", "Free Image Tools (Background Removal, Resize, Upscale, Filter, Quality)", "API Access", "Standard Support"]'::jsonb,
  updated_at = now()
WHERE slug = 'free';

-- Update Pro plan with daily limits and unlimited media
UPDATE subscription_plans 
SET 
  features = '["30 Connected Accounts", "15 Social Profiles", "500 Posts/Month", "30 Posts/Day", "Unlimited Media Uploads", "Free Image Tools (Background Removal, Resize, Upscale, Filter, Quality)", "API Access", "Priority Support", "Analytics Dashboard", "AI Captions", "AI Hashtag Suggestions", "AI Image Generation"]'::jsonb,
  updated_at = now()
WHERE slug = 'pro';

-- Update Business plan to include image tools mention
UPDATE subscription_plans 
SET 
  features = '["Unlimited Accounts", "Unlimited Social Profiles", "Unlimited Posts", "Unlimited Posts/Day", "Unlimited Media Uploads", "Free Image Tools (Background Removal, Resize, Upscale, Filter, Quality)", "Full API Access", "Team Members", "White Label", "Dedicated Support", "Custom Integrations", "Advanced Analytics", "All AI Features"]'::jsonb,
  updated_at = now()
WHERE slug = 'business';

-- Update default quotas for free users (1 post/day)
COMMENT ON TABLE user_quotas IS 'Free: max_posts_per_day=1, Pro: max_posts_per_day=30, Business: unlimited';