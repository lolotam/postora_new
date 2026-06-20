
-- FIX: user_credits - remove user INSERT policy (handled by add_user_credits SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;

-- FIX: credit_transactions - remove user INSERT policy (handled by add_user_credits/use_credits)
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;
