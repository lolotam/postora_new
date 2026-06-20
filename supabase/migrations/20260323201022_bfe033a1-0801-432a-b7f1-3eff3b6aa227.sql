-- Add xAI provider
INSERT INTO public.ai_providers (provider_code, name, api_endpoint, api_key_env_var, api_type, supports_streaming, is_active)
VALUES ('xai', 'xAI (Grok)', 'https://api.x.ai/v1', 'XAI_API_KEY', 'openai', true, false)
ON CONFLICT DO NOTHING;

-- Add Minimax provider
INSERT INTO public.ai_providers (provider_code, name, api_endpoint, api_key_env_var, api_type, supports_streaming, is_active)
VALUES ('minimax', 'Minimax', 'https://api.minimax.io/v1', 'MINIMAX_API_KEY', 'openai', true, false)
ON CONFLICT DO NOTHING;

-- xAI Models
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'grok-4.1', 'Grok 4.1', 'xAI flagship model with advanced reasoning', ARRAY['chat'], 256000, 3.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'xai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'grok-4.1-mini', 'Grok 4.1 Mini', 'Fast and efficient Grok model', ARRAY['chat'], 128000, 0.20, 0.50, true
FROM public.ai_providers p WHERE p.provider_code = 'xai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'grok-4', 'Grok 4', 'xAI reasoning model', ARRAY['chat'], 256000, 3.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'xai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'grok-3', 'Grok 3', 'Previous generation Grok model', ARRAY['chat'], 128000, 3.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'xai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'grok-3-mini', 'Grok 3 Mini', 'Fast previous generation Grok', ARRAY['chat'], 128000, 0.30, 0.50, true
FROM public.ai_providers p WHERE p.provider_code = 'xai'
ON CONFLICT DO NOTHING;

-- Minimax Models
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'MiniMax-M2', 'MiniMax-M2', 'Flagship chat model with 200K context', ARRAY['chat'], 200000, 1.00, 5.00, true
FROM public.ai_providers p WHERE p.provider_code = 'minimax'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'MiniMax-M1', 'MiniMax-M1', 'Reasoning model with 1M context, 456B parameters', ARRAY['chat'], 1000000, 2.00, 8.00, true
FROM public.ai_providers p WHERE p.provider_code = 'minimax'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'speech-2.6', 'Speech 2.6', 'Minimax TTS model', ARRAY['tts'], NULL, NULL, NULL, true
FROM public.ai_providers p WHERE p.provider_code = 'minimax'
ON CONFLICT DO NOTHING;

-- OpenAI New Models
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-5', 'GPT-5', 'OpenAI most capable model', ARRAY['chat'], 128000, 5.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-5-mini', 'GPT-5 Mini', 'Fast and affordable GPT-5 variant', ARRAY['chat'], 128000, 0.25, 2.00, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-5.2', 'GPT-5.2', 'Enhanced GPT-5 with improved reasoning', ARRAY['chat'], 128000, 1.75, 14.00, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-5.4', 'GPT-5.4', 'Latest GPT-5 series with top quality', ARRAY['chat'], 128000, 2.50, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-5.4-mini', 'GPT-5.4 Mini', 'Compact GPT-5.4 variant', ARRAY['chat'], 128000, 0.75, 4.50, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'o3', 'o3', 'OpenAI reasoning model', ARRAY['chat'], 200000, 10.00, 40.00, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'o4-mini', 'o4-mini', 'Fast OpenAI reasoning model', ARRAY['chat'], 200000, 1.10, 4.40, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-4.1-mini', 'GPT-4.1 Mini', 'Compact GPT-4.1 variant', ARRAY['chat'], 1000000, 0.40, 1.60, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gpt-4.1-nano', 'GPT-4.1 Nano', 'Smallest GPT-4.1 for high-volume tasks', ARRAY['chat'], 1000000, 0.10, 0.40, true
FROM public.ai_providers p WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

-- Anthropic New Models
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'claude-opus-4.6', 'Claude Opus 4.6', 'Most capable Anthropic model', ARRAY['chat'], 1000000, 5.00, 25.00, true
FROM public.ai_providers p WHERE p.provider_code = 'claude'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'claude-sonnet-4.6', 'Claude Sonnet 4.6', 'Balanced Claude model with 1M context', ARRAY['chat'], 1000000, 3.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'claude'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'claude-sonnet-4.5', 'Claude Sonnet 4.5', 'Previous generation high-performance Claude', ARRAY['chat'], 200000, 3.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'claude'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'claude-sonnet-4', 'Claude Sonnet 4', 'Reliable Claude workhorse model', ARRAY['chat'], 200000, 3.00, 15.00, true
FROM public.ai_providers p WHERE p.provider_code = 'claude'
ON CONFLICT DO NOTHING;

-- Gemini New Model
INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
SELECT p.id, 'gemini-3.1-flash-preview', 'Gemini 3.1 Flash Preview', 'Latest Gemini flash preview model', ARRAY['chat'], 1000000, 0.15, 0.60, true
FROM public.ai_providers p WHERE p.provider_code = 'gemini'
ON CONFLICT DO NOTHING;