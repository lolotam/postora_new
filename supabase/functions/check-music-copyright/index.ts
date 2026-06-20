import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeaders, handleCorsOptions, jsonResponse, errorResponse, badRequestResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    const ACRCLOUD_ACCESS_KEY = Deno.env.get('ACRCLOUD_ACCESS_KEY');
    const ACRCLOUD_ACCESS_SECRET = Deno.env.get('ACRCLOUD_ACCESS_SECRET');
    const ACRCLOUD_HOST = Deno.env.get('ACRCLOUD_HOST');

    if (!ACRCLOUD_ACCESS_KEY || !ACRCLOUD_ACCESS_SECRET || !ACRCLOUD_HOST) {
      console.error('Missing ACRCloud credentials');
      return errorResponse('ACRCloud not configured');
    }

    const { fileUrl } = await req.json();
    
    if (!fileUrl) {
      return badRequestResponse('No file URL provided');
    }

    console.log('Fetching audio/video file from:', fileUrl);

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error('Failed to fetch file:', fileResponse.status);
      return badRequestResponse('Failed to fetch file');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    // Only send first 10 seconds of audio (ACRCloud recommendation for efficiency)
    // For videos, ACRCloud will extract audio automatically
    const maxBytes = 1024 * 1024; // 1MB max sample
    const sampleBytes = fileBytes.slice(0, Math.min(fileBytes.length, maxBytes));

    console.log('File size:', fileBytes.length, 'Sample size:', sampleBytes.length);

    // Generate signature for ACRCloud
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signatureVersion = '1';
    const dataType = 'audio';
    const httpMethod = 'POST';
    const httpUri = '/v1/identify';

    const stringToSign = [
      httpMethod,
      httpUri,
      ACRCLOUD_ACCESS_KEY,
      dataType,
      signatureVersion,
      timestamp
    ].join('\n');

    // Create HMAC-SHA1 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ACRCLOUD_ACCESS_SECRET),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
    const signature = base64Encode(signatureBuffer);

    // Prepare form data
    const formData = new FormData();
    formData.append('access_key', ACRCLOUD_ACCESS_KEY);
    formData.append('sample_bytes', sampleBytes.length.toString());
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('data_type', dataType);
    formData.append('signature_version', signatureVersion);
    formData.append('sample', new Blob([sampleBytes]), 'sample.mp4');

    // Clean host URL
    let host = ACRCLOUD_HOST;
    if (!host.startsWith('http')) {
      host = `https://${host}`;
    }
    if (host.endsWith('/')) {
      host = host.slice(0, -1);
    }

    console.log('Sending request to ACRCloud:', host);

    const acrResponse = await fetch(`${host}/v1/identify`, {
      method: 'POST',
      body: formData,
    });

    const acrResult = await acrResponse.json();
    console.log('ACRCloud response:', JSON.stringify(acrResult));

    // Parse ACRCloud response
    if (acrResult.status?.code === 0 && acrResult.metadata?.music?.length > 0) {
      const music = acrResult.metadata.music[0];
      return jsonResponse({
        hasCopyrightedMusic: true,
        musicInfo: {
          title: music.title,
          artist: music.artists?.map((a: { name: string }) => a.name).join(', ') || 'Unknown Artist',
          album: music.album?.name || 'Unknown Album',
          label: music.label || 'Unknown Label',
          releaseDate: music.release_date,
          score: music.score,
          externalIds: {
            isrc: music.external_ids?.isrc,
            upc: music.external_ids?.upc,
          },
          externalMetadata: {
            spotify: music.external_metadata?.spotify,
            youtube: music.external_metadata?.youtube,
            deezer: music.external_metadata?.deezer,
          }
        }
      });
    } else if (acrResult.status?.code === 1001) {
      // No music recognized
      return jsonResponse({
        hasCopyrightedMusic: false,
        message: 'No copyrighted music detected'
      });
    } else {
      console.log('ACRCloud status:', acrResult.status);
      return jsonResponse({
        hasCopyrightedMusic: false,
        message: acrResult.status?.msg || 'Could not determine music copyright status'
      });
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in check-music-copyright:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      hasCopyrightedMusic: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
