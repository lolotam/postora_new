-- Drop the permissive INSERT policy that allows any authenticated user to insert logs
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.system_logs;
DROP POLICY IF EXISTS "System can insert system logs" ON public.system_logs;

-- Create a restricted INSERT policy for service_role only
CREATE POLICY "Only service role can insert logs"
ON public.system_logs
FOR INSERT
TO service_role
WITH CHECK (true);