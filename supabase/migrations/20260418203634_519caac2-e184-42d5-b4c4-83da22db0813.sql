DROP POLICY IF EXISTS "Users update own tiktok cache" ON public.tiktok_api_analytics_cache;
DROP POLICY IF EXISTS "Users delete own tiktok cache" ON public.tiktok_api_analytics_cache;

CREATE POLICY "Users update own tiktok cache"
  ON public.tiktok_api_analytics_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own tiktok cache"
  ON public.tiktok_api_analytics_cache FOR DELETE
  USING (auth.uid() = user_id);