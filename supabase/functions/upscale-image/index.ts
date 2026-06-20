import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCorsOptions, jsonResponse, errorResponse, unauthorizedResponse, badRequestResponse } from "../_shared/cors.ts";

const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let userId: string;
    let userEmail: string = 'unknown';

    // Check for API key first (for external API access)
    const apiKey = req.headers.get('x-api-key') || '';
    const authHeader = req.headers.get('authorization') || '';

    if (apiKey && apiKey.startsWith('postora-')) {
      // Validate API key and get user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('api_key', apiKey)
        .single();

      if (profileError || !profile) {
        console.error('API key validation failed:', profileError);
        return unauthorizedResponse('Invalid API key');
      }
      userId = profile.id;
      userEmail = profile.email;
    } else if (authHeader.startsWith('Bearer ')) {
      // JWT auth from browser session
      const token = authHeader.replace('Bearer ', '');
      const supabaseWithAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user }, error: userError } = await supabaseWithAuth.auth.getUser();
      
      if (userError || !user) {
        console.error('JWT validation failed:', userError);
        return unauthorizedResponse('Invalid or expired session');
      }
      userId = user.id;
      userEmail = user.email || 'unknown';
    } else {
      return unauthorizedResponse('Missing authentication');
    }

    console.log(`Upscale image request from user: ${userEmail}`);

    // Parse request body
    let imageUrl: string | null = null;
    let imageBase64: string | null = null;
    let scale: number = 2; // Default 2x upscale
    let platform: string = "cloudinary"; // Default platform

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const urlParam = formData.get('image_url') as string | null;
      const scaleParam = formData.get('scale') as string | null;
      const platformParam = formData.get('platform') as string | null;
      
      if (file) {
        const buffer = await file.arrayBuffer();
        imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      } else if (urlParam) {
        imageUrl = urlParam;
      }
      
      if (scaleParam) {
        scale = Math.min(4, Math.max(1, parseInt(scaleParam) || 2));
      }
      if (platformParam) {
        platform = platformParam;
      }
    } else {
      const body = await req.json();
      imageUrl = body.image_url || null;
      imageBase64 = body.image_base64 || null;
      scale = Math.min(4, Math.max(1, body.scale || 2));
      platform = body.platform || "cloudinary";
    }

    if (!imageUrl && !imageBase64) {
      return badRequestResponse('Please provide image_url, image_base64, or file in form-data');
    }

    console.log(`Upscale request - Platform: ${platform}, Scale: ${scale}x`);

    // Route to AtlasCloud for 4K upscaling
    if (platform === 'atlascloud') {
      const ATLASCLOUD_API_KEY = Deno.env.get('ATLASCLOUD_API_KEY');
      if (!ATLASCLOUD_API_KEY) {
        return errorResponse('AtlasCloud API key not configured', 500);
      }

      // AtlasCloud requires a URL, convert base64 if needed
      let targetImageUrl = imageUrl;
      if (!targetImageUrl && imageBase64) {
        // Need to upload to Cloudinary first to get a URL
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
          return errorResponse('Cloudinary configuration missing for base64 upload', 500);
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const folder = `postora/${userId}/temp`;
        const signParams = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(signParams);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const uploadFormData = new FormData();
        uploadFormData.append('api_key', CLOUDINARY_API_KEY);
        uploadFormData.append('timestamp', timestamp.toString());
        uploadFormData.append('signature', signature);
        uploadFormData.append('folder', folder);
        uploadFormData.append('file', `data:image/png;base64,${imageBase64}`);

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: uploadFormData }
        );

        if (!cloudinaryResponse.ok) {
          const errorText = await cloudinaryResponse.text();
          return errorResponse(`Failed to upload base64 for AtlasCloud: ${errorText}`, 500);
        }

        const cloudinaryData = await cloudinaryResponse.json();
        targetImageUrl = cloudinaryData.secure_url;
      }

      // Determine target resolution based on scale
      let targetResolution = "4k";
      if (scale <= 2) targetResolution = "2k";

      console.log(`Starting AtlasCloud upscale: ${targetResolution}`);

      // Step 1: Start AtlasCloud generation
      const generateResponse = await fetch('https://api.atlascloud.ai/api/v1/model/generateImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ATLASCLOUD_API_KEY}`,
        },
        body: JSON.stringify({
          model: "atlascloud/image-upscaler",
          image: targetImageUrl,
          creativity: 2,
          output_format: "jpeg",
          enable_sync_mode: false,
          target_resolution: targetResolution,
          enable_base64_output: false
        }),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('AtlasCloud generate error:', errorText);
        
        // Parse specific AtlasCloud errors for better user feedback
        if (generateResponse.status === 402 || errorText.includes('insufficient_balance') || errorText.includes('Insufficient balance')) {
          return errorResponse('AtlasCloud credits exhausted. Please add funds to your AtlasCloud account or use Cloudinary upscaling instead.', 402);
        }
        if (generateResponse.status === 401) {
          return errorResponse('AtlasCloud API key is invalid or expired. Please check your configuration.', 401);
        }
        if (generateResponse.status === 429) {
          return errorResponse('AtlasCloud rate limit exceeded. Please wait a moment and try again.', 429);
        }
        
        return errorResponse(`AtlasCloud generation failed: ${errorText}`, generateResponse.status);
      }

      const generateJson = await generateResponse.json();
      if (generateJson.code !== 200 || !generateJson.data?.id) {
        // Check for balance/payment errors in response body
        if (generateJson.message?.toLowerCase().includes('balance') || generateJson.message?.toLowerCase().includes('credit')) {
          return errorResponse('AtlasCloud credits exhausted. Please add funds or use Cloudinary upscaling.', 402);
        }
        return errorResponse(`AtlasCloud generation failed: ${generateJson.message || 'Unknown error'}`, 500);
      }

      const predictionId = generateJson.data.id;
      console.log(`AtlasCloud prediction started: ${predictionId}`);

      // Step 2: Poll for result
      const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`;
      let attempts = 0;
      const maxAttempts = 60;
      let upscaledUrl: string | null = null;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

        const pollResponse = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${ATLASCLOUD_API_KEY}` },
        });

        if (!pollResponse.ok) continue;

        const result = await pollResponse.json();
        console.log(`Poll attempt ${attempts}:`, result.data?.status);

        if (result.data?.status === 'completed') {
          upscaledUrl = result.data.outputs?.[0];
          break;
        } else if (result.data?.status === 'failed') {
          return errorResponse(`AtlasCloud upscale failed: ${result.data.error || 'Unknown error'}`, 500);
        }
      }

      if (!upscaledUrl) {
        return errorResponse('AtlasCloud upscale timed out', 504);
      }

      return jsonResponse({
        success: true,
        original_url: imageUrl || 'base64_upload',
        upscaled_url: upscaledUrl,
        prediction_id: predictionId,
        target_resolution: targetResolution,
        scale: scale,
        platform: 'atlascloud',
      });
    }

    // Default: Cloudinary upscaling
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return errorResponse('Cloudinary configuration missing', 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `postora/${userId}/upscaled`;
    
    // Create signature for Cloudinary
    const signParams = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signParams);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Build upload form data
    const uploadFormData = new FormData();
    uploadFormData.append('api_key', CLOUDINARY_API_KEY);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', folder);

    if (imageUrl) {
      uploadFormData.append('file', imageUrl);
    } else if (imageBase64) {
      uploadFormData.append('file', `data:image/png;base64,${imageBase64}`);
    }

    console.log(`Uploading to Cloudinary for ${scale}x upscaling...`);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: uploadFormData,
      }
    );

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      console.error('Cloudinary error:', errorText);
      return errorResponse(`Upscale upload failed: ${errorText}`, 500);
    }

    const cloudinaryData = await cloudinaryResponse.json();
    console.log('Upload successful:', cloudinaryData.public_id);

    // Generate the upscaled URL using Cloudinary's AI upscaling
    const upscaledUrl = cloudinaryData.secure_url.replace(
      '/upload/',
      `/upload/e_upscale,w_${cloudinaryData.width * scale},h_${cloudinaryData.height * scale}/`
    );

    // Also provide standard quality enhance option
    const enhancedUrl = cloudinaryData.secure_url.replace(
      '/upload/',
      '/upload/e_improve,e_sharpen/'
    );

    return jsonResponse({
      success: true,
      original_url: imageUrl || 'base64_upload',
      upscaled_url: upscaledUrl,
      enhanced_url: enhancedUrl,
      public_id: cloudinaryData.public_id,
      original_width: cloudinaryData.width,
      original_height: cloudinaryData.height,
      upscaled_width: cloudinaryData.width * scale,
      upscaled_height: cloudinaryData.height * scale,
      scale: scale,
      platform: 'cloudinary',
      format: cloudinaryData.format,
    });

  } catch (error) {
    console.error('Upscale image error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
  }
});
