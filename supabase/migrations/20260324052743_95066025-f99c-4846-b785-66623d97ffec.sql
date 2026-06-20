
CREATE TABLE public.bi_post_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id text NOT NULL,
  platform text NOT NULL,
  username text,
  post_data jsonb NOT NULL,
  transcript text,
  transcript_language text,
  transcript_duration numeric,
  captions text[] DEFAULT '{}',
  image_prompts text[] DEFAULT '{}',
  video_prompts text[] DEFAULT '{}',
  generation_language text,
  generation_tone text,
  generation_platform text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id, platform)
);

ALTER TABLE public.bi_post_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content"
  ON public.bi_post_content FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access bi_post_content"
  ON public.bi_post_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
