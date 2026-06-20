DO $$
DECLARE
  v_provider_id UUID;
BEGIN
  SELECT id INTO v_provider_id FROM public.ai_providers WHERE provider_code = 'minimax';
  
  IF v_provider_id IS NULL THEN
    RAISE NOTICE 'MiniMax provider not found, skipping';
    RETURN;
  END IF;

  UPDATE public.ai_models SET is_active = false WHERE provider_id = v_provider_id;

  INSERT INTO public.ai_models (provider_id, model_id, name, description, capabilities, context_limit, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_active)
  VALUES
    (v_provider_id, 'MiniMax-M2.7', 'MiniMax M2.7', 'Latest flagship model with 204K context', ARRAY['chat','code','reasoning'], 204800, 0.30, 1.20, true),
    (v_provider_id, 'MiniMax-M2.7-highspeed', 'MiniMax M2.7 Highspeed', 'Fast variant of M2.7', ARRAY['chat','code'], 204800, 0.30, 1.20, true),
    (v_provider_id, 'MiniMax-M2.5', 'MiniMax M2.5', 'Previous generation flagship', ARRAY['chat','code'], 204800, 0.30, 1.20, true),
    (v_provider_id, 'MiniMax-M2.5-highspeed', 'MiniMax M2.5 Highspeed', 'Fast variant of M2.5', ARRAY['chat','code'], 204800, 0.30, 1.20, true),
    (v_provider_id, 'M2-her', 'MiniMax M2 Her', 'Conversational model', ARRAY['chat'], 200000, 1.00, 5.00, true),
    (v_provider_id, 'speech-2.8-hd', 'Speech 2.8 HD', 'High-definition TTS', ARRAY['tts'], NULL, NULL, NULL, true),
    (v_provider_id, 'speech-2.8-turbo', 'Speech 2.8 Turbo', 'Fast TTS', ARRAY['tts'], NULL, NULL, NULL, true),
    (v_provider_id, 'speech-2.6-hd', 'Speech 2.6 HD', 'HD TTS (legacy)', ARRAY['tts'], NULL, NULL, NULL, true),
    (v_provider_id, 'speech-2.6-turbo', 'Speech 2.6 Turbo', 'Fast TTS (legacy)', ARRAY['tts'], NULL, NULL, NULL, true),
    (v_provider_id, 'hailuo-2.3', 'MiniMax Hailuo 2.3', 'Video generation model', ARRAY['video'], NULL, NULL, NULL, true),
    (v_provider_id, 'hailuo-2.3-fast', 'MiniMax Hailuo 2.3 Fast', 'Fast video generation', ARRAY['video'], NULL, NULL, NULL, true),
    (v_provider_id, 'hailuo-02', 'MiniMax Hailuo 02', 'Video generation (previous gen)', ARRAY['video'], NULL, NULL, NULL, true),
    (v_provider_id, 'music-2.5-plus', 'Music 2.5+', 'Music generation premium', ARRAY['audio'], NULL, NULL, NULL, true),
    (v_provider_id, 'music-2.5', 'Music 2.5', 'Music generation', ARRAY['audio'], NULL, NULL, NULL, true)
  ON CONFLICT DO NOTHING;
END $$;

UPDATE public.ai_providers 
SET api_endpoint = 'https://api.minimax.io/v1'
WHERE provider_code = 'minimax';