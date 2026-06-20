
-- 1. Fix user_credits: Drop broad UPDATE policy that lets users set their own balance
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update their credits" ON public.user_credits;

-- Drop any UPDATE policy on user_credits (get all of them)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'user_credits' AND schemaname = 'public' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_credits', pol.policyname);
  END LOOP;
END $$;

-- 2. Fix system_logs: Drop permissive INSERT policy for all authenticated users
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'system_logs' AND schemaname = 'public' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.system_logs', pol.policyname);
  END LOOP;
END $$;

-- 3. Fix email-attachments bucket: Make it private
UPDATE storage.buckets SET public = false WHERE id = 'email-attachments';
