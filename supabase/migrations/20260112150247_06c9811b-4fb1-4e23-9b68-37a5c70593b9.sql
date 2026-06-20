-- =============================================
-- Database Indexes for Performance Optimization
-- =============================================

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON public.posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts(user_id, created_at DESC);

-- Social accounts table indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_token_expires ON public.social_accounts(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_accounts_is_active ON public.social_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform ON public.social_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_profile ON public.social_accounts(social_profile_id) WHERE social_profile_id IS NOT NULL;

-- Platform posts table indexes
CREATE INDEX IF NOT EXISTS idx_platform_posts_post_id ON public.platform_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_platform_posts_status ON public.platform_posts(status);
CREATE INDEX IF NOT EXISTS idx_platform_posts_platform ON public.platform_posts(platform);
CREATE INDEX IF NOT EXISTS idx_platform_posts_social_account ON public.platform_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_platform_posts_created_at ON public.platform_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_posts_post_status ON public.platform_posts(post_id, status);

-- System logs indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON public.system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON public.system_logs(source);

-- API logs indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_api_logs_user_endpoint ON public.api_logs(user_id, endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);

-- User subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Media files indexes
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON public.media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_folder ON public.media_files(folder_path);
CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON public.media_files(created_at DESC);