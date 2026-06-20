import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCorsOptions, jsonResponse, errorResponse, unauthorizedResponse, badRequestResponse } from "../_shared/cors.ts";

const ATLASCLOUD_API_KEY = Deno.env.get('ATLASCLOUD_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // Get API key from headers
    const apiKey = req.headers.get('x-api-key') || 
                   req.headers.get('authorization')?.replace(/^(Bearer |Apikey )/i, '') || '';

    if (!apiKey || !apiKey.startsWith('postora-')) {
      return unauthorizedResponse('Invalid or missing API key');
    }

    // Validate API key and get user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('api_key', apiKey)
      .single();

    if (profileError || !profile) {
      console.error('API key validation failed:', profileError);
      return unauthorizedResponse('Invalid API key');
    }

    console.log(`AtlasCloud upscale request from user: ${profile.email}`);

    // Validate AtlasCloud API key
    if (!ATLASCLOUD_API_KEY) {
      return errorResponse('AtlasCloud API key not configured', 500);
    }

    // Parse request body
    let imageUrl: string | null = null;
    let creativity: number = 2;
    let targetResolution: string = "4k";
    let outputFormat: string = "jpeg";

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const urlParam = formData.get('image_url') as string | null;
      const creativityParam = formData.get('creativity') as string | null;
      const resolutionParam = formData.get('target_resolution') as string | null;
      const formatParam = formData.get('output_format') as string | null;
      
      if (urlParam) {
        imageUrl = urlParam;
      }
      
      if (creativityParam) {
        creativity = Math.min(10, Math.max(0, parseInt(creativityParam) || 2));
      }
      if (resolutionParam) {
        targetResolution = resolutionParam;
      }
      if (formatParam) {
        outputFormat = formatParam;
      }
    } else {
      const body = await req.json();
      imageUrl = body.image_url || null;
      creativity = Math.min(10, Math.max(0, body.creativity || 2));
      targetResolution = body.target_resolution || "4k";
      outputFormat = body.output_format || "jpeg";
    }

    if (!imageUrl) {
      return badRequestResponse('Please provide image_url');
    }

    console.log(`Starting AtlasCloud 4K upscale for image: ${imageUrl.substring(0, 100)}...`);

    // Step 1: Start image generation with AtlasCloud
    const generateUrl = 'https://api.atlascloud.ai/api/v1/model/generateImage';

    const generateResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ATLASCLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        model: "atlascloud/image-upscaler",
        image: imageUrl,
        creativity: creativity,
        output_format: outputFormat,
        enable_sync_mode: false,
        target_resolution: targetResolution,
        enable_base64_output: false
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('AtlasCloud generate error:', errorText);
      return errorResponse(`AtlasCloud generation failed: ${errorText}`, 500);
    }

    const generateJson = await generateResponse.json();
    console.log('AtlasCloud generate response:', JSON.stringify(generateJson));

    if (generateJson.code !== 200 || !generateJson.data?.id) {
      return errorResponse(`AtlasCloud generation failed: ${generateJson.message || 'Unknown error'}`, 500);
    }

    const predictionId = generateJson.data.id;
    console.log(`AtlasCloud prediction started: ${predictionId}`);

    // Step 2: Poll for result
    const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max with 2-second intervals
    let upscaledUrl: string | null = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const pollResponse = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${ATLASCLOUD_API_KEY}` },
      });

      if (!pollResponse.ok) {
        console.error(`Poll attempt ${attempts} failed:`, pollResponse.status);
        continue;
      }

      const result = await pollResponse.json();
      console.log(`Poll attempt ${attempts}:`, result.data?.status);

      if (result.data?.status === 'completed') {
        upscaledUrl = result.data.outputs?.[0];
        console.log('AtlasCloud upscale completed:', upscaledUrl);
        break;
      } else if (result.data?.status === 'failed') {
        return errorResponse(`AtlasCloud upscale failed: ${result.data.error || 'Unknown error'}`, 500);
      }
      // Otherwise continue polling (status is 'pending' or 'processing')
    }

    if (!upscaledUrl) {
      return errorResponse('AtlasCloud upscale timed out after 2 minutes', 504);
    }

    // Log successful upscale to system_logs
    try {
      await supabase.from('system_logs').insert({
        level: 'info',
        category: 'ai',
        source: 'upscale-image-atlas',
        message: `Image upscaled to ${targetResolution} via AtlasCloud`,
        user_id: profile.id,
        metadata: {
          feature: 'image_upscale',
          platform: 'atlascloud',
          target_resolution: targetResolution,
          creativity: creativity,
          output_format: outputFormat,
          prediction_id: predictionId,
          original_url: imageUrl?.substring(0, 200),
          success: true,
        },
      });
    } catch (logErr) {
      console.error('Failed to log upscale:', logErr);
    }

    return jsonResponse({
      success: true,
      original_url: imageUrl,
      upscaled_url: upscaledUrl,
      prediction_id: predictionId,
      target_resolution: targetResolution,
      creativity: creativity,
      output_format: outputFormat,
      platform: 'atlascloud',
    });

  } catch (error) {
    console.error('AtlasCloud upscale error:', error);

    // Log failed upscale to system_logs
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.from('system_logs').insert({
        level: 'error',
        category: 'ai',
        source: 'upscale-image-atlas',
        message: `Image upscale failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          feature: 'image_upscale',
          platform: 'atlascloud',
          error: error instanceof Error ? error.message : String(error),
          success: false,
        },
      });
    } catch (logErr) {
      console.error('Failed to log upscale error:', logErr);
    }

    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
  }
});
