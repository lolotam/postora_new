import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheAvatarToCloudinary } from "../_shared/avatar-cache.ts";
import { authenticateCaller } from "../_shared/auth-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INSTAGRAM_APP_ID = Deno.env.get("INSTAGRAM_APP_ID")!;
const INSTAGRAM_APP_SECRET = Deno.env.get("INSTAGRAM_APP_SECRET")!;

function normalizeUsername(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toLowerCase().replace(/^@/, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !/^Bearer \S+$/.test(authHeader)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
    console.error("Instagram OAuth configuration is incomplete");
    return new Response(JSON.stringify({ error: "Service configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let user_id: string;
  try {
    const auth = await authenticateCaller(req, body.user_id);
    user_id = auth.userId;
  } catch {
    console.warn("Instagram OAuth authentication failed");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.action) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const validActions = ["authorize", "callback"];
  const missingActionField =
    !body.redirect_uri ||
    (body.action === "callback" && !body.code);

  if (!validActions.includes(body.action) || missingActionField) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, code, redirect_uri, social_profile_id, return_to } = body;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "authorize") {
      const scopes = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights";

      const state = btoa(JSON.stringify({
        user_id,
        social_profile_id,
        platform: "instagram_business",
      }));

      const authUrl = new URL("https://www.instagram.com/oauth/authorize");
      authUrl.searchParams.set("client_id", INSTAGRAM_APP_ID);
      authUrl.searchParams.set("redirect_uri", redirect_uri);
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("state", state);

      console.log("Instagram Business Login authorization URL generated, redirect_uri:", redirect_uri);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      console.log("Processing Instagram Business Login callback for user:", user_id);

      // Step 1: Exchange code for short-lived token
      const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: redirect_uri,
          code: code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error_message || tokenData.error) {
        throw new Error(`Instagram OAuth error: ${tokenData.error_message || tokenData.error}`);
      }

      const shortLivedToken = tokenData.access_token;
      const rawIgUserId = String(tokenData.user_id);

      // Step 2: Exchange for long-lived token
      const longLivedResponse = await fetch(
        `https://graph.instagram.com/v22.0/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedToken}`
      );
      const longLivedData = await longLivedResponse.json();

      const finalAccessToken = longLivedData.access_token || shortLivedToken;
      const expiresIn = longLivedData.expires_in || 5184000; // 60 days default

      // Step 3: Get user profile info
      const profileResponse = await fetch(
        `https://graph.instagram.com/v22.0/me?fields=id,username,account_type,profile_picture_url&access_token=${finalAccessToken}`
      );
      const profileData = await profileResponse.json();
      console.log("Instagram profile:", JSON.stringify(profileData).slice(0, 300));

      // Detect Personal accounts — Content Publishing API only works with Business/Creator
      if (profileData.account_type === 'PERSONAL') {
        console.log("Detected PERSONAL Instagram account — returning structured response for frontend routing");
        return new Response(JSON.stringify({
          error: "personal_account",
          account_type: "PERSONAL",
          requires_facebook: true,
          message: "Your Instagram account is a Personal account. Personal accounts cannot connect directly — they must be linked through a Facebook Page.",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use canonical ID from /me endpoint (may differ from token exchange ID)
      const igUserId = String(profileData.id || rawIgUserId);
      console.log(`Instagram canonical ID: ${igUserId} (token ID: ${rawIgUserId}), account_type: ${profileData.account_type}`);

      const username = profileData.username || `ig_${igUserId}`;
      const rawAvatarUrl = profileData.profile_picture_url;

      // Cache avatar to Cloudinary
      const avatarUrl = await cacheAvatarToCloudinary(rawAvatarUrl, user_id, "instagram", igUserId);

      const normalizedUsername = normalizeUsername(username);

      // Step 4: Check for existing Instagram account by normalized username (merge logic)
      const { data: existingAccounts } = await supabase
        .from("social_accounts")
        .select("id, platform_user_id, platform_username")
        .eq("user_id", user_id)
        .eq("platform", "instagram")
        .eq("is_active", true);

      let existingId: string | null = null;
      if (existingAccounts && existingAccounts.length > 0) {
        for (const acc of existingAccounts) {
          const existingNormalized = normalizeUsername(acc.platform_username);
          if (existingNormalized === normalizedUsername) {
            existingId = acc.id;
            console.log(`Found existing Instagram account by username match: ${acc.platform_username} (id: ${acc.id})`);
            break;
          }
        }
      }

      const accountData = {
        user_id,
        platform: "instagram",
        platform_user_id: igUserId,
        platform_username: username,
        avatar_url: avatarUrl,
        access_token: finalAccessToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        is_active: true,
        social_profile_id,
        ig_auth_type: "business_login",
        account_metadata: {
          ig_user_id: igUserId,
          ig_username: username,
          account_type: profileData.account_type || "business_login",
          token_type: "long_lived",
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        needs_reauth: false,
        failure_count: 0,
        last_refresh_error: null,
      };

      let dbError;
      if (existingId) {
        // Update existing record (merge: same username, different auth path)
        const { error } = await supabase
          .from("social_accounts")
          .update(accountData)
          .eq("id", existingId);
        dbError = error;
        console.log("Updated existing Instagram account (merge by username):", existingId);
      } else {
        // Upsert by platform_user_id (normal path)
        const { error } = await supabase
          .from("social_accounts")
          .upsert(accountData, {
            onConflict: "user_id,platform,platform_user_id",
          });
        dbError = error;
      }

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save Instagram account");
      }

      console.log("Instagram Business Login account saved successfully");

      return new Response(JSON.stringify({ success: true, username }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Instagram OAuth request failed:", error);
    return new Response(
      JSON.stringify({ error: "Authentication failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
