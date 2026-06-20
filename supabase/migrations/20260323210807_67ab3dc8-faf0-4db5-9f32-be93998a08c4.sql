
-- Update existing imagen-4.0-generate-preview to GA model ID
UPDATE ai_models 
SET model_id = 'imagen-4.0-generate-001', name = 'Imagen 4 Standard'
WHERE model_id = 'imagen-4.0-generate-preview';

-- Google: Add new image generation models
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, v.model_id, v.name, v.description, ARRAY['image'], true, v.cost_in, v.cost_out
FROM ai_providers p,
(VALUES
  ('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image (Nano Banana 2)', 'Fast image generation and editing with pro-level quality', 0::numeric, 0::numeric),
  ('gemini-3-pro-image-preview', 'Gemini 3 Pro Image', 'Next-generation pro image generation model', 0::numeric, 0::numeric),
  ('imagen-4.0-fast-generate-001', 'Imagen 4 Fast', 'Fast Imagen 4 image generation', 0::numeric, 0::numeric),
  ('imagen-4.0-ultra-generate-001', 'Imagen 4 Ultra (Preview)', 'Highest quality Imagen 4 image generation', 0::numeric, 0::numeric)
) AS v(model_id, name, description, cost_in, cost_out)
WHERE p.provider_code = 'google'
ON CONFLICT DO NOTHING;

-- OpenAI: Add GPT Image models
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, v.model_id, v.name, v.description, ARRAY['image'], true, v.cost_in, v.cost_out
FROM ai_providers p,
(VALUES
  ('gpt-image-1.5', 'GPT Image 1.5', 'State-of-the-art OpenAI image generation', 0::numeric, 0::numeric),
  ('gpt-image-1', 'GPT Image 1', 'Versatile OpenAI image generation', 0::numeric, 0::numeric),
  ('gpt-image-1-mini', 'GPT Image 1 Mini', 'Cost-efficient OpenAI image generation', 0::numeric, 0::numeric)
) AS v(model_id, name, description, cost_in, cost_out)
WHERE p.provider_code = 'openai'
ON CONFLICT DO NOTHING;

-- xAI: Add Grok 2 Image
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, 'grok-2-image', 'Grok 2 Image (Aurora)', 'Text-to-image generation via xAI Aurora', ARRAY['image'], true, 0, 0
FROM ai_providers p
WHERE p.provider_code = 'xai'
ON CONFLICT DO NOTHING;

-- Minimax: Add Image-01
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, 'image-01', 'MiniMax Image-01', 'MiniMax text-to-image generation', ARRAY['image'], true, 0, 0
FROM ai_providers p
WHERE p.provider_code = 'minimax'
ON CONFLICT DO NOTHING;
