-- Add new xAI chat models
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, context_limit, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
VALUES
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-4.20-0309-reasoning', 'Grok 4.20 Reasoning', 'Most capable reasoning model from xAI', ARRAY['chat'], 2000000, true, 2.00, 6.00),
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-4.20-0309-non-reasoning', 'Grok 4.20 Non-Reasoning', 'Most capable non-reasoning model from xAI', ARRAY['chat'], 2000000, true, 2.00, 6.00),
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-4.20-multi-agent-0309', 'Grok 4.20 Multi-Agent', 'Multi-agent capable model from xAI', ARRAY['chat'], 2000000, true, 2.00, 6.00),
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-4-1-fast-reasoning', 'Grok 4.1 Fast Reasoning', 'Fast reasoning model with lower cost', ARRAY['chat'], 2000000, true, 0.20, 0.50),
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-4-1-fast-non-reasoning', 'Grok 4.1 Fast Non-Reasoning', 'Fast non-reasoning model with lower cost', ARRAY['chat'], 2000000, true, 0.20, 0.50)
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Remove outdated image model
DELETE FROM ai_models WHERE provider_id = 'cdce5758-3604-4e05-9d53-75c4ae2d267f' AND model_id = 'grok-2-image';

-- Add new image generation models
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
VALUES
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-imagine-image-pro', 'Grok Imagine Image Pro', 'High-quality image generation by xAI', ARRAY['image'], true, 0.07, 0.07),
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-imagine-image', 'Grok Imagine Image', 'Cost-efficient image generation by xAI', ARRAY['image'], true, 0.02, 0.02)
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Add video generation model
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
VALUES
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-imagine-video', 'Grok Imagine Video', 'Video generation by xAI', ARRAY['video'], true, 0.05, 0.05)
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Add TTS model
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
VALUES
  ('cdce5758-3604-4e05-9d53-75c4ae2d267f', 'grok-tts', 'Grok TTS', 'Text-to-speech by xAI', ARRAY['tts'], true, 4.20, 4.20)
ON CONFLICT (provider_id, model_id) DO NOTHING;