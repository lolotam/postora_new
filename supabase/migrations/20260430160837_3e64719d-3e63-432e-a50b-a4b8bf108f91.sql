
INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
SELECT 
  '146a9939-e54e-4077-932b-03806d30b6d6',
  '23d9c7b3-952f-4ff2-9997-f655552c4055',
  'active',
  now(),
  now() + interval '1 year',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions 
  WHERE user_id = '146a9939-e54e-4077-932b-03806d30b6d6' AND status = 'active'
);
