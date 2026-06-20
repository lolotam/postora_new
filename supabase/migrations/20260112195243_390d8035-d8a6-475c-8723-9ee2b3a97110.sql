-- Update Free plan
UPDATE subscription_plans 
SET 
  features = '["3 Connected Accounts", "2 Social Profiles", "30 Posts/Month", "API Access", "Standard Support"]'::jsonb,
  profile_limit = 2,
  updated_at = now()
WHERE slug = 'free';

-- Update Pro plan
UPDATE subscription_plans 
SET 
  features = '["30 Connected Accounts", "15 Social Profiles", "500 Posts/Month", "API Access", "Priority Support", "Analytics Dashboard", "AI Captions", "AI Hashtag Suggestions", "AI Image Generation"]'::jsonb,
  profile_limit = 15,
  updated_at = now()
WHERE slug = 'pro';

-- Update Business plan
UPDATE subscription_plans 
SET 
  features = '["Unlimited Accounts", "Unlimited Social Profiles", "Unlimited Posts", "Full API Access", "Team Members", "White Label", "Dedicated Support", "Custom Integrations", "Advanced Analytics", "All AI Features"]'::jsonb,
  profile_limit = -1,
  updated_at = now()
WHERE slug = 'business';