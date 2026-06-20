-- Backfill the orphaned Instagram platform_posts rows for post a422a4e3
-- (function timed out before inserting; content was already published on Meta)
INSERT INTO public.platform_posts (post_id, social_account_id, platform, platform_post_id, platform_post_url, status, posted_at, response_data)
SELECT 'a422a4e3-278b-4aaa-a7da-870ee1f4a0f9'::uuid, '1dc6324b-4678-45db-a8df-dd3d78daabcc'::uuid, 'instagram',
       '18084872744099848', 'https://www.instagram.com/postora.cloud/', 'success', NOW(),
       '{"ig_post_subtype":"story","account_username":"postora.cloud","backfilled":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.platform_posts WHERE platform_post_id = '18084872744099848');

INSERT INTO public.platform_posts (post_id, social_account_id, platform, platform_post_id, platform_post_url, status, posted_at, response_data)
SELECT 'a422a4e3-278b-4aaa-a7da-870ee1f4a0f9'::uuid, '1dc6324b-4678-45db-a8df-dd3d78daabcc'::uuid, 'instagram',
       '18112992055813337', 'https://www.instagram.com/postora.cloud/', 'success', NOW(),
       '{"ig_post_subtype":"reel","account_username":"postora.cloud","shared_to_feed":true,"backfilled":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.platform_posts WHERE platform_post_id = '18112992055813337');

-- Mark the post as completed (Story + Reel + FB Reel all succeeded on Meta side)
UPDATE public.posts SET status = 'completed', posted_at = COALESCE(posted_at, NOW())
WHERE id = 'a422a4e3-278b-4aaa-a7da-870ee1f4a0f9' AND status = 'processing';