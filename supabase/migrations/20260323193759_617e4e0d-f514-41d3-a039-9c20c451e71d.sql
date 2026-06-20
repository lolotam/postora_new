-- AI Configuration Tables
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  api_key_env_var TEXT NOT NULL,
  api_type TEXT NOT NULL DEFAULT 'openai',
  supports_streaming BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{chat}',
  context_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cost_per_1m_input_tokens NUMERIC(10,4),
  cost_per_1m_output_tokens NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, model_id)
);

CREATE TABLE IF NOT EXISTS public.ai_model_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  feature TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_providers_select" ON public.ai_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_providers_admin_all" ON public.ai_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_models_select" ON public.ai_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_models_admin_all" ON public.ai_models FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_model_preferences_own" ON public.ai_model_preferences FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_settings_admin_all" ON public.system_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_ai_models_updated_at BEFORE UPDATE ON public.ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_ai_model_preferences_updated_at BEFORE UPDATE ON public.ai_model_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed Providers
INSERT INTO public.ai_providers (provider_code, name, api_endpoint, api_key_env_var, api_type, supports_streaming, is_active) VALUES
  ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'OPENROUTER_API_KEY', 'openai', true, true),
  ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'GOOGLE_AI_STUDIO_KEY', 'google', true, true),
  ('openai', 'OpenAI', 'https://api.openai.com/v1', 'OPENAI_API_KEY', 'openai', true, false),
  ('claude', 'Anthropic Claude', 'https://api.anthropic.com/v1', 'ANTHROPIC_API_KEY', 'anthropic', true, false),
  ('perplexity', 'Perplexity AI', 'https://api.perplexity.ai', 'PERPLEXITY_API_KEY', 'openai', true, false),
  ('zai', 'Z AI', 'https://open.bigmodel.cn/api/paas/v4', 'ZAI_API_KEY', 'openai', true, false),
  ('elevenlabs', 'ElevenLabs', 'https://api.elevenlabs.io/v1', 'ELEVENLABS_API_KEY', 'elevenlabs', false, false),
  ('brave_search', 'Brave Search', 'https://api.search.brave.com', 'BRAVE_SEARCH_API_KEY', 'rest', false, false),
  ('exa', 'Exa Search', 'https://api.exa.ai', 'EXA_API_KEY', 'rest', false, false)
ON CONFLICT (provider_code) DO NOTHING;

-- Seed Models: OpenRouter
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('openai/gpt-4o', 'GPT-4o', 'OpenAI flagship multimodal', ARRAY['chat','image'], 128000, 2.5, 10.0),
  ('openai/gpt-4o-mini', 'GPT-4o Mini', 'Small efficient GPT-4o', ARRAY['chat'], 128000, 0.15, 0.6),
  ('anthropic/claude-sonnet-4-20250514', 'Claude Sonnet 4', 'Latest Anthropic model', ARRAY['chat'], 200000, 3.0, 15.0),
  ('anthropic/claude-3.5-haiku-20241022', 'Claude 3.5 Haiku', 'Fast Anthropic model', ARRAY['chat'], 200000, 0.8, 4.0),
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google fast model via OR', ARRAY['chat','image'], 1048576, 0.15, 0.6),
  ('google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google pro model via OR', ARRAY['chat','image'], 1048576, 1.25, 10.0),
  ('meta-llama/llama-4-maverick', 'Llama 4 Maverick', 'Meta open-source', ARRAY['chat'], 1048576, 0.2, 0.6),
  ('deepseek/deepseek-r1', 'DeepSeek R1', 'DeepSeek reasoning', ARRAY['chat'], 164000, 0.55, 2.19),
  ('mistralai/mistral-large-latest', 'Mistral Large', 'Mistral flagship', ARRAY['chat'], 128000, 2.0, 6.0),
  ('qwen/qwen-2.5-72b-instruct', 'Qwen 2.5 72B', 'Alibaba large model', ARRAY['chat'], 131072, 0.36, 0.36)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: Gemini
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Latest next-gen reasoning', ARRAY['chat'], 1048576, 0, 0),
  ('gemini-3-pro-preview', 'Gemini 3 Pro Preview', 'Next-gen reasoning', ARRAY['chat'], 1048576, 0, 0),
  ('gemini-3-flash-preview', 'Gemini 3 Flash Preview', 'Fast next-gen', ARRAY['chat'], 1048576, 0, 0),
  ('gemini-2.5-pro', 'Gemini 2.5 Pro', 'Top-tier reasoning', ARRAY['chat','image'], 1048576, 1.25, 10.0),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 'Balanced speed & quality', ARRAY['chat','image'], 1048576, 0.15, 0.6),
  ('gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'Fastest & cheapest', ARRAY['chat'], 1048576, 0.075, 0.3),
  ('gemini-2.0-flash', 'Gemini 2.0 Flash', 'Previous-gen fast', ARRAY['chat','image'], 1048576, 0.1, 0.4),
  ('gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite', 'Previous-gen lightweight', ARRAY['chat'], 1048576, 0.075, 0.3),
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'Legacy pro 2M context', ARRAY['chat','image'], 2097152, 1.25, 5.0),
  ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'Legacy fast', ARRAY['chat','image'], 1048576, 0.075, 0.3),
  ('gemini-1.5-flash-8b', 'Gemini 1.5 Flash 8B', 'Legacy compact', ARRAY['chat'], 1048576, 0.0375, 0.15),
  ('gemini-2.5-flash-preview-image-generation', 'Gemini Image Gen', 'Image generation', ARRAY['image'], 8192, 0.15, 0.6),
  ('imagen-4.0-generate-preview', 'Imagen 4', 'Imagen 4 image gen', ARRAY['image'], 0, 0.04, 0),
  ('gemini-2.5-flash-preview-tts', 'Gemini TTS', 'Text-to-speech', ARRAY['tts'], 8192, 0, 0),
  ('gemini-2.5-flash-preview-native-audio', 'Gemini Native Audio', 'Native audio', ARRAY['tts','stt'], 8192, 0, 0),
  ('veo-2.0-generate-preview', 'Veo 2', 'Video generation', ARRAY['video'], 0, 0, 0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'gemini'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: OpenAI
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('gpt-4o', 'GPT-4o', 'Flagship multimodal', ARRAY['chat','image'], 128000, 2.5, 10.0),
  ('gpt-4o-mini', 'GPT-4o Mini', 'Small efficient', ARRAY['chat'], 128000, 0.15, 0.6),
  ('gpt-4.1', 'GPT-4.1', 'Latest GPT-4', ARRAY['chat'], 1047576, 2.0, 8.0),
  ('o3-mini', 'o3-mini', 'Reasoning model', ARRAY['chat'], 200000, 1.1, 4.4),
  ('dall-e-3', 'DALL-E 3', 'Image generation', ARRAY['image'], 0, 0, 0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'openai'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: Claude
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('claude-sonnet-4-20250514', 'Claude Sonnet 4', 'Latest balanced', ARRAY['chat'], 200000, 3.0, 15.0),
  ('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Previous flagship', ARRAY['chat'], 200000, 3.0, 15.0),
  ('claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'Fast & affordable', ARRAY['chat'], 200000, 0.8, 4.0),
  ('claude-3-opus-20240229', 'Claude 3 Opus', 'Most capable legacy', ARRAY['chat'], 200000, 15.0, 75.0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'claude'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: Perplexity
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('sonar-pro', 'Sonar Pro', 'Advanced search + reasoning', ARRAY['chat','search'], 200000, 3.0, 15.0),
  ('sonar', 'Sonar', 'Standard search', ARRAY['chat','search'], 127072, 1.0, 1.0),
  ('sonar-deep-research', 'Sonar Deep Research', 'Deep multi-step', ARRAY['chat','search'], 127072, 2.0, 8.0),
  ('sonar-reasoning-pro', 'Sonar Reasoning Pro', 'Advanced reasoning', ARRAY['chat','search'], 127072, 2.0, 8.0),
  ('sonar-reasoning', 'Sonar Reasoning', 'Reasoning + search', ARRAY['chat','search'], 127072, 1.0, 5.0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'perplexity'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: Z AI
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('glm-4-plus', 'GLM-4 Plus', 'Flagship', ARRAY['chat'], 128000, 0.7, 0.7),
  ('glm-4-long', 'GLM-4 Long', 'Long context', ARRAY['chat'], 1000000, 0.14, 0.14),
  ('glm-4-air', 'GLM-4 Air', 'Balanced', ARRAY['chat'], 128000, 0.07, 0.07),
  ('glm-4-airx', 'GLM-4 AirX', 'Fast inference', ARRAY['chat'], 8192, 0.14, 0.14),
  ('glm-4-flash', 'GLM-4 Flash', 'Fast & free', ARRAY['chat'], 128000, 0, 0),
  ('glm-4-flashx', 'GLM-4 FlashX', 'Enhanced flash', ARRAY['chat'], 128000, 0.014, 0.014),
  ('glm-4.7-flash', 'GLM-4.7 Flash', 'Latest flash', ARRAY['chat'], 128000, 0, 0),
  ('glm-4v-plus', 'GLM-4V Plus', 'Vision model', ARRAY['chat','image'], 8192, 0.14, 0.14),
  ('glm-4v', 'GLM-4V', 'Standard vision', ARRAY['chat','image'], 2048, 0.7, 0.7),
  ('glm-4v-flash', 'GLM-4V Flash', 'Fast vision', ARRAY['chat','image'], 8192, 0, 0),
  ('cogview-4-250304', 'CogView 4', 'Image gen', ARRAY['image'], 0, 0.42, 0),
  ('cogview-4-flash', 'CogView 4 Flash', 'Fast image gen', ARRAY['image'], 0, 0, 0),
  ('cogview-3-flash', 'CogView 3 Flash', 'Legacy image gen', ARRAY['image'], 0, 0, 0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'zai'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: ElevenLabs
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('eleven_multilingual_v2', 'Multilingual V2', 'High quality TTS', ARRAY['tts'], 0, 0, 0),
  ('eleven_turbo_v2_5', 'Turbo V2.5', 'Fast low-latency TTS', ARRAY['tts'], 0, 0, 0),
  ('eleven_scribe_v1', 'Scribe V1', 'Speech-to-text', ARRAY['stt'], 0, 0, 0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'elevenlabs'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: Brave Search
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('brave-web-search', 'Web Search', 'Web search API', ARRAY['search'], 0, 0, 0),
  ('brave-news-search', 'News Search', 'News search API', ARRAY['search'], 0, 0, 0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'brave_search'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed Models: Exa
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, m.model_id, m.name, m.description, m.capabilities, m.context_limit, m.cost_in, m.cost_out
FROM public.ai_providers p,
(VALUES
  ('exa-search', 'Exa Search', 'Neural web search', ARRAY['search'], 0, 0, 0),
  ('exa-find-similar', 'Find Similar', 'Similar pages', ARRAY['search'], 0, 0, 0),
  ('exa-contents', 'Get Contents', 'Extract content', ARRAY['search'], 0, 0, 0)
) AS m(model_id, name, description, capabilities, context_limit, cost_in, cost_out)
WHERE p.provider_code = 'exa'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('default_ai_model', '{"provider_code": "gemini", "model_id": "gemini-2.5-flash"}'::jsonb, 'Global default AI model'),
  ('default_ai_model_chat', '{"provider_code": "gemini", "model_id": "gemini-2.5-flash"}'::jsonb, 'Default chat model'),
  ('default_ai_model_image', '{"provider_code": "gemini", "model_id": "gemini-2.5-flash-preview-image-generation"}'::jsonb, 'Default image gen model'),
  ('default_ai_model_tts', '{"provider_code": "gemini", "model_id": "gemini-2.5-flash-preview-tts"}'::jsonb, 'Default TTS model'),
  ('default_ai_model_video', '{"provider_code": "gemini", "model_id": "veo-2.0-generate-preview"}'::jsonb, 'Default video gen model'),
  ('default_ai_model_search', '{"provider_code": "gemini", "model_id": "gemini-2.5-flash"}'::jsonb, 'Default search model'),
  ('default_ai_model_stt', '{"provider_code": "gemini", "model_id": "gemini-2.5-flash-preview-native-audio"}'::jsonb, 'Default STT model')
ON CONFLICT (key) DO NOTHING;

-- Database function: get_active_ai_model_config
CREATE OR REPLACE FUNCTION public.get_active_ai_model_config(
  p_user_id UUID,
  p_feature TEXT DEFAULT 'general'
)
RETURNS TABLE(
  provider_code TEXT,
  model_id TEXT,
  model_name TEXT,
  api_endpoint TEXT,
  api_key_env_var TEXT,
  api_type TEXT,
  supports_streaming BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pref_model_id UUID;
  v_system_default JSONB;
BEGIN
  SELECT amp.model_id INTO v_pref_model_id
  FROM public.ai_model_preferences amp
  WHERE amp.user_id = p_user_id AND amp.feature = p_feature;

  IF v_pref_model_id IS NOT NULL THEN
    RETURN QUERY
    SELECT ap.provider_code, am.model_id, am.name, ap.api_endpoint, ap.api_key_env_var, ap.api_type, ap.supports_streaming
    FROM public.ai_models am JOIN public.ai_providers ap ON ap.id = am.provider_id
    WHERE am.id = v_pref_model_id AND am.is_active AND ap.is_active LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT ss.value INTO v_system_default FROM public.system_settings ss WHERE ss.key = 'default_ai_model_' || p_feature;
  IF v_system_default IS NOT NULL THEN
    RETURN QUERY
    SELECT ap.provider_code, am.model_id, am.name, ap.api_endpoint, ap.api_key_env_var, ap.api_type, ap.supports_streaming
    FROM public.ai_models am JOIN public.ai_providers ap ON ap.id = am.provider_id
    WHERE ap.provider_code = (v_system_default->>'provider_code') AND am.model_id = (v_system_default->>'model_id') AND am.is_active AND ap.is_active LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT ss.value INTO v_system_default FROM public.system_settings ss WHERE ss.key = 'default_ai_model';
  IF v_system_default IS NOT NULL THEN
    RETURN QUERY
    SELECT ap.provider_code, am.model_id, am.name, ap.api_endpoint, ap.api_key_env_var, ap.api_type, ap.supports_streaming
    FROM public.ai_models am JOIN public.ai_providers ap ON ap.id = am.provider_id
    WHERE ap.provider_code = (v_system_default->>'provider_code') AND am.model_id = (v_system_default->>'model_id') AND am.is_active AND ap.is_active LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY SELECT 'gemini'::TEXT, 'gemini-2.5-flash'::TEXT, 'Gemini 2.5 Flash (Fallback)'::TEXT,
    'https://generativelanguage.googleapis.com/v1beta'::TEXT, 'GOOGLE_AI_STUDIO_KEY'::TEXT, 'google'::TEXT, true::BOOLEAN;
END;
$$;