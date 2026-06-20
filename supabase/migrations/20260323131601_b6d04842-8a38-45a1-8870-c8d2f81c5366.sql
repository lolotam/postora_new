INSERT INTO public.user_roles (user_id, role)
VALUES ('aca32ca0-a63a-41d5-9bc1-45a471b2faae', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;