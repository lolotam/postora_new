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

    console.log(`Remove background request from user: ${profile.email}`);

    // Parse request body
    let imageUrl: string | null = null;
    let imageBase64: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const urlParam = formData.get('image_url') as string | null;
      
      if (file) {
        const buffer = await file.arrayBuffer();
        imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      } else if (urlParam) {
        imageUrl = urlParam;
      }
    } else {
      const body = await req.json();
      imageUrl = body.image_url || null;
      imageBase64 = body.image_base64 || null;
    }

    if (!imageUrl && !imageBase64) {
      return badRequestResponse('Please provide image_url, image_base64, or file in form-data');
    }

    // Upload to Cloudinary with background_removal transformation
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return errorResponse('Cloudinary configuration missing', 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `postora/${profile.id}/processed`;
    
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
    uploadFormData.append('background_removal', 'cloudinary_ai');

    if (imageUrl) {
      uploadFormData.append('file', imageUrl);
    } else if (imageBase64) {
      uploadFormData.append('file', `data:image/png;base64,${imageBase64}`);
    }

    console.log('Uploading to Cloudinary with background removal...');

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
      return errorResponse(`Background removal failed: ${errorText}`, 500);
    }

    const cloudinaryData = await cloudinaryResponse.json();
    console.log('Background removal successful:', cloudinaryData.public_id);

    // Generate the URL with background removal transformation applied
    const processedUrl = cloudinaryData.secure_url.replace('/upload/', '/upload/e_background_removal/');

    return jsonResponse({
      success: true,
      original_url: imageUrl || 'base64_upload',
      processed_url: processedUrl,
      public_id: cloudinaryData.public_id,
      width: cloudinaryData.width,
      height: cloudinaryData.height,
      format: cloudinaryData.format,
      bytes: cloudinaryData.bytes,
    });

  } catch (error) {
    console.error('Remove background error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
  }
});
