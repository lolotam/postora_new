-- Add media upload tracking columns to user_quotas
ALTER TABLE user_quotas 
ADD COLUMN IF NOT EXISTS media_uploads_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_media_uploads_per_day integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS media_daily_reset_date timestamp with time zone DEFAULT ((CURRENT_DATE + '1 day'::interval))::timestamp with time zone;

-- Create function to set quotas based on subscription plan
CREATE OR REPLACE FUNCTION public.set_user_quotas_for_plan(p_user_id uuid, p_plan_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_posts_per_day integer;
  v_max_posts_per_month integer;
  v_max_profiles integer;
  v_max_social_accounts integer;
  v_max_media_uploads_per_day integer;
BEGIN
  -- Set limits based on plan
  CASE p_plan_slug
    WHEN 'free' THEN
      v_max_posts_per_day := 1;
      v_max_posts_per_month := 30;
      v_max_profiles := 2;
      v_max_social_accounts := 3;
      v_max_media_uploads_per_day := 20;
    WHEN 'pro' THEN
      v_max_posts_per_day := 30;
      v_max_posts_per_month := 500;
      v_max_profiles := 15;
      v_max_social_accounts := 30;
      v_max_media_uploads_per_day := -1; -- unlimited
    WHEN 'business' THEN
      v_max_posts_per_day := -1; -- unlimited
      v_max_posts_per_month := -1; -- unlimited
      v_max_profiles := -1; -- unlimited
      v_max_social_accounts := -1; -- unlimited
      v_max_media_uploads_per_day := -1; -- unlimited
    ELSE
      -- Default to free tier
      v_max_posts_per_day := 1;
      v_max_posts_per_month := 30;
      v_max_profiles := 2;
      v_max_social_accounts := 3;
      v_max_media_uploads_per_day := 20;
  END CASE;

  -- Upsert user quotas
  INSERT INTO user_quotas (
    user_id,
    max_posts_per_day,
    max_posts_per_month,
    max_profiles,
    max_social_accounts,
    max_media_uploads_per_day,
    updated_at
  ) VALUES (
    p_user_id,
    v_max_posts_per_day,
    v_max_posts_per_month,
    v_max_profiles,
    v_max_social_accounts,
    v_max_media_uploads_per_day,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    max_posts_per_day = v_max_posts_per_day,
    max_posts_per_month = v_max_posts_per_month,
    max_profiles = v_max_profiles,
    max_social_accounts = v_max_social_accounts,
    max_media_uploads_per_day = v_max_media_uploads_per_day,
    updated_at = now();
END;
$$;

-- Create trigger function for subscription changes
CREATE OR REPLACE FUNCTION public.handle_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_slug text;
BEGIN
  -- Get the plan slug
  SELECT slug INTO v_plan_slug
  FROM subscription_plans
  WHERE id = NEW.plan_id;

  -- Set quotas based on plan
  PERFORM set_user_quotas_for_plan(NEW.user_id, v_plan_slug);

  RETURN NEW;
END;
$$;

-- Create trigger on user_subscriptions
DROP TRIGGER IF EXISTS on_subscription_change ON user_subscriptions;
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE OF plan_id ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_change();

-- Create function to increment media uploads
CREATE OR REPLACE FUNCTION public.increment_media_uploads(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_uploads integer;
  v_max_uploads integer;
  v_reset_date timestamp with time zone;
BEGIN
  -- Get current quota info
  SELECT media_uploads_today, max_media_uploads_per_day, media_daily_reset_date
  INTO v_current_uploads, v_max_uploads, v_reset_date
  FROM user_quotas
  WHERE user_id = p_user_id;

  -- If no quota record, create one with free tier defaults
  IF NOT FOUND THEN
    INSERT INTO user_quotas (user_id, media_uploads_today, max_media_uploads_per_day)
    VALUES (p_user_id, 1, 20);
    RETURN true;
  END IF;

  -- Reset if past reset date
  IF v_reset_date <= now() THEN
    UPDATE user_quotas
    SET media_uploads_today = 1,
        media_daily_reset_date = (CURRENT_DATE + '1 day'::interval)::timestamp with time zone
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- Check if unlimited (-1)
  IF v_max_uploads = -1 THEN
    UPDATE user_quotas
    SET media_uploads_today = v_current_uploads + 1
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- Check if at limit
  IF v_current_uploads >= v_max_uploads THEN
    RETURN false;
  END IF;

  -- Increment
  UPDATE user_quotas
  SET media_uploads_today = v_current_uploads + 1
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- Create function to check if user can upload media
CREATE OR REPLACE FUNCTION public.can_upload_media(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_uploads integer;
  v_max_uploads integer;
  v_reset_date timestamp with time zone;
BEGIN
  SELECT media_uploads_today, max_media_uploads_per_day, media_daily_reset_date
  INTO v_current_uploads, v_max_uploads, v_reset_date
  FROM user_quotas
  WHERE user_id = p_user_id;

  -- If no quota record, allow (will create on first upload)
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Reset check
  IF v_reset_date <= now() THEN
    RETURN true;
  END IF;

  -- Unlimited check
  IF v_max_uploads = -1 THEN
    RETURN true;
  END IF;

  RETURN v_current_uploads < v_max_uploads;
END;
$$;