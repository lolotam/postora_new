
INSERT INTO ai_models (provider_id, model_id, name, description, capabilities, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
SELECT p.id, v.model_id, v.name, v.description, ARRAY['image'], true, 0, 0
FROM ai_providers p,
(VALUES
  ('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image (Nano Banana 2)', 'Fast image generation and editing with pro-level quality'),
  ('gemini-3-pro-image-preview', 'Gemini 3 Pro Image', 'Next-generation pro image generation model'),
  ('imagen-4.0-fast-generate-001', 'Imagen 4 Fast', 'Fast Imagen 4 image generation'),
  ('imagen-4.0-ultra-generate-001', 'Imagen 4 Ultra (Preview)', 'Highest quality Imagen 4 image generation')
) AS v(model_id, name, description)
WHERE p.provider_code = 'gemini'
ON CONFLICT DO NOTHING;
