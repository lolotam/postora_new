-- Drop the overly permissive policies and replace with proper service role checks
DROP POLICY IF EXISTS "Service role can manage credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.credit_transactions;

-- For user_credits: Allow inserts only for the user's own record
CREATE POLICY "Users can insert their own credits"
ON public.user_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- For credit_transactions: Allow inserts only for the user's own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);