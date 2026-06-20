import { corsHeaders, handleCorsOptions, cacheableJsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions();
  }

  // Return public (non-secret) app IDs that the frontend needs
  // These are publishable values — safe to expose
  const config = {
    FACEBOOK_APP_ID: Deno.env.get("FACEBOOK_APP_ID") || "",
    THREADS_APP_ID: Deno.env.get("THREADS_APP_ID") || "",
    INSTAGRAM_APP_ID: Deno.env.get("INSTAGRAM_APP_ID") || "",
    TIKTOK_CLIENT_KEY: Deno.env.get("TIKTOK_CLIENT_KEY") || "",
    PINTEREST_CLIENT_ID: Deno.env.get("PINTEREST_CLIENT_ID") || "",
    LINKEDIN_CLIENT_ID: Deno.env.get("LINKEDIN_CLIENT_ID") || "",
    GOOGLE_CLIENT_ID: Deno.env.get("GOOGLE_CLIENT_ID") || "",
    TWITTER_CLIENT_ID: Deno.env.get("TWITTER_CLIENT_ID") || "",
  };

  // Cache for 5 minutes — these rarely change
  return cacheableJsonResponse(config, 300);
});
