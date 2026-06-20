import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheAvatarToCloudinary } from "../_shared/avatar-cache.ts";
import { authenticateCaller } from "../_shared/auth-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDDIT_CLIENT_ID = Deno.env.get("REDDIT_CLIENT_ID")!;
const REDDIT_CLIENT_SECRET = Deno.env.get("REDDIT_CLIENT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, code, redirect_uri, social_profile_id, return_to } = body;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "authorize") {
      const { userId: user_id } = await authenticateCaller(req, body.user_id);

      const scopes = "identity submit read";
      
      const state = btoa(JSON.stringify({
        user_id,
        social_profile_id,
        return_to: return_to || redirect_uri,
      }));

      const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
      authUrl.searchParams.set("client_id", REDDIT_CLIENT_ID);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("redirect_uri", redirect_uri || `${return_to}/profiles`);
      authUrl.searchParams.set("duration", "permanent");
      authUrl.searchParams.set("scope", scopes);

      console.log("Reddit OAuth authorization URL generated");

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const { userId: user_id } = await authenticateCaller(req, body.user_id);
      console.log("Processing Reddit OAuth callback for user:", user_id);

      // Exchange code for access token
      const credentials = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
      
      const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Postora/1.0",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log("Reddit token response:", JSON.stringify(tokenData).slice(0, 200));

      if (tokenData.error) {
        throw new Error(`Reddit OAuth error: ${tokenData.error}`);
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 3600;

      // Get user profile
      const profileResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "Postora/1.0",
        },
      });
      const profileData = await profileResponse.json();
      console.log("Reddit profile:", JSON.stringify(profileData).slice(0, 200));

      const username = profileData.name;
      const userId_reddit = profileData.id;
      const rawAvatarUrl = profileData.icon_img?.split("?")[0]; // Remove query params from avatar URL

      // Cache avatar to Cloudinary for permanent storage
      const avatarUrl = await cacheAvatarToCloudinary(rawAvatarUrl, user_id, "reddit", userId_reddit);

      // Atomic upsert - prevents race conditions and ensures only 1 row per user/platform/account
      const { error: dbError } = await supabase
        .from("social_accounts")
        .upsert(
          {
            user_id,
            platform: "reddit",
            platform_user_id: userId_reddit,
            platform_username: username,
            avatar_url: avatarUrl,
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            is_active: true,
            social_profile_id,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            account_metadata: { 
              karma: profileData.total_karma,
              is_mod: profileData.is_mod,
            },
            // Reset health tracking on successful reconnection
            needs_reauth: false,
            failure_count: 0,
            last_refresh_error: null,
          },
          {
            onConflict: "user_id,platform,platform_user_id",
          }
        );

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save Reddit account");
      }

      console.log("Reddit account saved successfully via atomic upsert");

      return new Response(JSON.stringify({ success: true, username }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Reddit OAuth error:", error);
    // Return sanitized error message to prevent schema leakage
    return new Response(
      JSON.stringify({ error: "Authentication failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
