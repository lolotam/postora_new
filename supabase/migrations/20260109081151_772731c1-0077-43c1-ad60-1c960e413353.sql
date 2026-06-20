-- Add max_posts_per_day column to user_quotas table
ALTER TABLE public.user_quotas 
ADD COLUMN IF NOT EXISTS max_posts_per_day integer DEFAULT 2;

-- Add posts_today column to track daily usage
ALTER TABLE public.user_quotas 
ADD COLUMN IF NOT EXISTS posts_today integer DEFAULT 0;

-- Add daily_reset_date to track when to reset daily posts
ALTER TABLE public.user_quotas 
ADD COLUMN IF NOT EXISTS daily_reset_date timestamp with time zone DEFAULT (CURRENT_DATE + interval '1 day')::timestamptz;