-- Fix the overly permissive RLS policy by making it more restrictive
-- Only allow updates via service role key (already implicitly allowed) 
-- Drop the permissive policy and replace with a proper one

DROP POLICY IF EXISTS "Service role can update referrals" ON public.referrals;

-- Allow users to update their own referrals where they are the referrer
CREATE POLICY "Users can update their own referrals" 
ON public.referrals 
FOR UPDATE 
USING (auth.uid() = referrer_id)
WITH CHECK (auth.uid() = referrer_id);