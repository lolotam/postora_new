-- Fix backup_codes table RLS to prevent anonymous access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own backup codes" ON public.backup_codes;
DROP POLICY IF EXISTS "Users can insert own backup codes" ON public.backup_codes;
DROP POLICY IF EXISTS "Users can update own backup codes" ON public.backup_codes;
DROP POLICY IF EXISTS "Users can delete own backup codes" ON public.backup_codes;

-- Create secure policies that require authentication

-- Users can only view their own backup codes (authenticated only)
CREATE POLICY "Users can view own backup codes"
ON public.backup_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own backup codes (authenticated only)
CREATE POLICY "Users can insert own backup codes"
ON public.backup_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own backup codes (authenticated only)
CREATE POLICY "Users can update own backup codes"
ON public.backup_codes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own backup codes (authenticated only)
CREATE POLICY "Users can delete own backup codes"
ON public.backup_codes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);