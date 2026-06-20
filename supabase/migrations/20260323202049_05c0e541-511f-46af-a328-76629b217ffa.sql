-- Insert new Z AI (ZhipuAI) models
INSERT INTO ai_models (provider_id, model_id, name, capabilities, context_limit, is_active, cost_per_1m_input_tokens, cost_per_1m_output_tokens)
VALUES
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-5', 'GLM-5', ARRAY['chat'], 128000, true, 1.00, 3.20),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-5-turbo', 'GLM-5 Turbo', ARRAY['chat'], 128000, true, 1.20, 4.00),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-5-code', 'GLM-5 Code', ARRAY['chat'], 128000, true, 1.20, 5.00),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.7', 'GLM-4.7', ARRAY['chat'], 128000, true, 0.60, 2.20),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.7-flashx', 'GLM-4.7 FlashX', ARRAY['chat'], 128000, true, 0.07, 0.40),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.6', 'GLM-4.6', ARRAY['chat'], 128000, true, 0.60, 2.20),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.5', 'GLM-4.5', ARRAY['chat'], 128000, true, 0.60, 2.20),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.5-x', 'GLM-4.5-X', ARRAY['chat'], 128000, true, 2.20, 8.90),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.5-air', 'GLM-4.5 Air', ARRAY['chat'], 128000, true, 0.20, 1.10),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.5-airx', 'GLM-4.5 AirX', ARRAY['chat'], 128000, true, 1.10, 4.50),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4-32b-0414-128k', 'GLM-4 32B', ARRAY['chat'], 128000, true, 0.10, 0.10),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.5-flash', 'GLM-4.5 Flash', ARRAY['chat'], 128000, true, 0, 0),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.6v', 'GLM-4.6V', ARRAY['chat','image'], 128000, true, 0.30, 0.90),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-ocr', 'GLM-OCR', ARRAY['chat','image'], 32000, true, 0.03, 0.03),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.6v-flashx', 'GLM-4.6V FlashX', ARRAY['chat','image'], 128000, true, 0.04, 0.40),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.5v', 'GLM-4.5V', ARRAY['chat','image'], 128000, true, 0.60, 1.80),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-4.6v-flash', 'GLM-4.6V Flash', ARRAY['chat','image'], 128000, true, 0, 0),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-image', 'GLM-Image', ARRAY['image'], null, true, 0.015, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'cogvideox-3', 'CogVideoX-3', ARRAY['video'], null, true, 0.20, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'viduq1-text', 'ViduQ1 Text', ARRAY['video'], null, true, 0.40, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'viduq1-image', 'ViduQ1 Image', ARRAY['video'], null, true, 0.40, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'viduq1-start-end', 'ViduQ1 Start-End', ARRAY['video'], null, true, 0.40, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'vidu2-image', 'Vidu2 Image', ARRAY['video'], null, true, 0.20, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'vidu2-start-end', 'Vidu2 Start-End', ARRAY['video'], null, true, 0.20, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'vidu2-reference', 'Vidu2 Reference', ARRAY['video'], null, true, 0.40, null),
  ('44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a', 'glm-asr-2512', 'GLM-ASR-2512', ARRAY['stt'], null, true, 0.03, null)
ON CONFLICT (provider_id, model_id) DO NOTHING;

UPDATE ai_models SET capabilities = ARRAY['chat'], cost_per_1m_input_tokens = 0, cost_per_1m_output_tokens = 0
WHERE provider_id = '44bee76d-d3cb-4cbe-aabf-f5d4e0d3a38a' AND model_id = 'glm-4.7-flash';