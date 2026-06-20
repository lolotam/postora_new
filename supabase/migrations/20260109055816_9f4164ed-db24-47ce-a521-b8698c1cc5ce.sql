-- 1. Create a secure view for public social accounts (excludes sensitive tokens)
CREATE VIEW public.public_social_accounts AS
SELECT 
  sa.id, 
  sa.platform, 
  sa.platform_username, 
  sa.avatar_url, 
  sa.is_active, 
  sa.social_profile_id
FROM public.social_accounts sa
WHERE EXISTS (
  SELECT 1 FROM public.social_profiles sp 
  WHERE sp.id = sa.social_profile_id AND sp.is_public = true
);

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_social_accounts TO authenticated, anon;

-- 2. Drop the dangerous RLS policy that exposes tokens
DROP POLICY IF EXISTS "Anyone can view accounts of public profiles" ON public.social_accounts;

-- 3. Add missing UPDATE policy for platform_posts
CREATE POLICY "Users can update own platform posts" 
ON public.platform_posts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.posts 
  WHERE posts.id = platform_posts.post_id 
  AND posts.user_id = auth.uid()
));

-- 4. Add missing DELETE policy for platform_posts
CREATE POLICY "Users can delete own platform posts" 
ON public.platform_posts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.posts 
  WHERE posts.id = platform_posts.post_id 
  AND posts.user_id = auth.uid()
));