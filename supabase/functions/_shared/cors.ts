/**
 * Shared CORS headers for Supabase Edge Functions
 * Import this in your edge functions for consistent CORS handling
 * 
 * @example
 * import { corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
 * 
 * serve(async (req) => {
 *   // Handle CORS preflight
 *   if (req.method === 'OPTIONS') {
 *     return handleCorsOptions();
 *   }
 *   
 *   // Your logic here...
 *   
 *   return new Response(JSON.stringify(data), {
 *     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 *   });
 * });
 */

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

/**
 * Handle CORS OPTIONS preflight request
 * @returns Response with CORS headers and 200 status
 */
export function handleCorsOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create a JSON response with CORS headers
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @returns Response with JSON body and CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response with CORS headers
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @returns Response with error JSON and CORS headers
 */
export function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create an unauthorized response
 * @param message - Error message (default: "Unauthorized")
 * @returns Response with 401 status and CORS headers
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return errorResponse(message, 401);
}

/**
 * Create a bad request response
 * @param message - Error message (default: "Bad Request")
 * @returns Response with 400 status and CORS headers
 */
export function badRequestResponse(message = "Bad Request"): Response {
  return errorResponse(message, 400);
}

/**
 * Create a JSON response with CORS + Cache-Control headers
 * Use for semi-static data (feature flags, public config) that can be cached by CDN
 * @param data - Data to serialize as JSON
 * @param maxAge - Cache duration in seconds (default: 300 = 5 minutes)
 * @param status - HTTP status code (default: 200)
 * @returns Response with JSON body, CORS headers, and Cache-Control
 */
export function cacheableJsonResponse(data: unknown, maxAge = 300, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });
}
