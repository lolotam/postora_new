-- Add scheduled_at column for blog posts scheduled publishing
ALTER TABLE public.blog_posts 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of scheduled posts
CREATE INDEX idx_blog_posts_scheduled_at ON public.blog_posts(scheduled_at) 
WHERE scheduled_at IS NOT NULL AND status = 'scheduled';

-- Update status check to allow 'scheduled' status
-- Note: We'll handle this in application logic since the current status column doesn't have constraints