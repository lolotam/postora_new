ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check 
  CHECK (status = ANY (ARRAY['pending','processing','completed','failed','scheduled']));