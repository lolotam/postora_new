import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheAvatarToCloudinary } from "../_shared/avatar-cache.ts";
import { authenticateCaller } from "../_shared/auth-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { action, code, redirect_uri, social_profile_id, account_id: rawAccountId, social_account_id } = body;
    const account_id = rawAccountId || social_account_id;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] TikTok OAuth - Action: ${action}`);
    console.log(`[${timestamp}] TikTok OAuth - Redirect URI: ${redirect_uri}`);
    console.log(`[${timestamp}] TikTok OAuth - Account ID: ${account_id || 'N/A'}`);
    console.log(`[${timestamp}] TikTok OAuth - Social Profile ID: ${social_profile_id || 'N/A'}`);

    // user_id will be resolved from JWT in each action
    let user_id: string | undefined;
    // Generate authorization URL
    if (action === "authorize") {
      if (!TIKTOK_CLIENT_KEY) {
        console.error(`[${timestamp}] ERROR: TIKTOK_CLIENT_KEY not configured`);
        throw new Error("TIKTOK_CLIENT_KEY not configured");
      }

      // Check if sandbox mode is enabled
      let isSandboxMode = false;
      try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const { data: sandboxSetting } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "tiktok_sandbox_mode")
          .single();
        
        if (sandboxSetting) {
          const value = sandboxSetting.value;
          isSandboxMode = value === true || value === "true" || (typeof value === "string" && JSON.parse(value) === true);
        }
        console.log(`[${timestamp}] TikTok Sandbox Mode: ${isSandboxMode}`);
      } catch (e) {
        console.log(`[${timestamp}] Could not check sandbox mode setting, defaulting to production`);
      }

      // Scopes:
      // - user.info.basic: display_name + avatar
      // - user.info.profile: username (handle), bio, profile link, verification
      // - user.info.stats: follower/following/likes/video counts (Analytics)
      // - video.list: list of user's public videos (Analytics)
      // - video.upload + video.publish: posting
      const scope = "user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish";
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}`;

      console.log(`[${timestamp}] Generated TikTok auth URL with scope: ${scope}`);
      console.log(`[${timestamp}] Redirect URI being used: ${redirect_uri}`);
      console.log(`[${timestamp}] Using client key starting with: ${TIKTOK_CLIENT_KEY?.substring(0, 4)}...`);

      return new Response(JSON.stringify({ 
        url: authUrl,
        debug: {
          sandbox_mode: isSandboxMode,
          scope,
          redirect_uri,
          client_key_prefix: TIKTOK_CLIENT_KEY?.substring(0, 4) + "...",
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle OAuth callback - exchange code for tokens
    if (action === "callback") {
      const auth = await authenticateCaller(req, body.user_id);
      user_id = auth.userId;
      if (!code) {
        console.error(`[${timestamp}] ERROR: Missing code`);
        throw new Error("Missing code");
      }

      if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
        console.error(`[${timestamp}] ERROR: TikTok credentials not configured`);
        throw new Error("TikTok credentials not configured");
      }

      console.log(`[${timestamp}] Exchanging authorization code for access token...`);
      console.log(`[${timestamp}] Using redirect_uri for token exchange: ${redirect_uri}`);

      // Exchange code for access token
      const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log(`[${timestamp}] Token API response status: ${tokenResponse.status}`);
      
      if (tokenData.error) {
        console.error(`[${timestamp}] TOKEN ERROR:`, JSON.stringify(tokenData.error));
        console.error(`[${timestamp}] Error code: ${tokenData.error.code || 'unknown'}`);
        console.error(`[${timestamp}] Error message: ${tokenData.error.message || 'unknown'}`);
        console.error(`[${timestamp}] Error description: ${tokenData.error_description || 'none'}`);
        throw new Error(tokenData.error.message || tokenData.error_description || "Failed to get access token");
      }
      
      console.log(`[${timestamp}] Token exchange successful - open_id: ${tokenData.open_id}`);

      const { access_token, refresh_token, expires_in, open_id } = tokenData;

      // Initialize Supabase client early to fetch existing account data if needed
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Get user info from TikTok - include username field for the actual TikTok handle
      const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const userData = await userResponse.json();
      console.log("User info response status:", userResponse.status);
      console.log("User data:", JSON.stringify(userData));

      // Check if we got a scope error - user needs to re-authorize with new scopes
      let tiktokUsername: string | undefined;
      let displayName: string | undefined;
      let rawAvatarUrl: string | undefined;

      if (userData.error?.code === "scope_not_authorized") {
        console.log("Scope not authorized - trying to fetch existing account data");
        
        // Try to get existing account data to preserve display name
        const { data: existingAccount } = await supabase
          .from("social_accounts")
          .select("platform_username, avatar_url, account_metadata")
          .eq("user_id", user_id)
          .eq("platform", "tiktok")
          .eq("platform_user_id", open_id)
          .single();

        if (existingAccount) {
          displayName = existingAccount.platform_username || existingAccount.account_metadata?.display_name;
          tiktokUsername = existingAccount.account_metadata?.tiktok_username;
          rawAvatarUrl = existingAccount.avatar_url;
          console.log(`Using existing account data - display: ${displayName}, handle: ${tiktokUsername}`);
        }
      } else {
        // Successfully got user info from TikTok
        // - username: the actual @ handle (e.g., "nonywaleed.tam201") - used for URL construction in backend
        // - display_name: the profile name shown in UI (e.g., "𝐻𝑎𝑛𝑜𝑛𝑎:)🌊") - used for frontend display
        tiktokUsername = userData.data?.user?.username;
        displayName = userData.data?.user?.display_name;
        rawAvatarUrl = userData.data?.user?.avatar_url;
      }

      // Store display_name in platform_username for UI display, keep handle in account_metadata for URLs
      const usernameForDisplay = displayName || tiktokUsername || open_id;
      
      console.log(`TikTok handle: ${tiktokUsername}, display_name (for UI): ${displayName}`);
      
      // Cache avatar to Cloudinary for permanent storage (only if we have a new avatar URL)
      const avatarUrl = rawAvatarUrl ? await cacheAvatarToCloudinary(rawAvatarUrl, user_id, "tiktok", open_id) : null;

      // TikTok access tokens expire in 24 hours, refresh tokens last 365 days

      // TikTok access tokens expire in 24 hours, refresh tokens last 365 days
      // Use the actual expires_in from the response (typically 86400 seconds = 24 hours)
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      const { error: dbError } = await supabase
        .from("social_accounts")
        .upsert({
          user_id: user_id,
          platform: "tiktok",
          platform_user_id: open_id,
          platform_username: usernameForDisplay,
          access_token: access_token,
          refresh_token: refresh_token,
          token_expires_at: tokenExpiresAt,
          avatar_url: avatarUrl,
          is_active: true,
          // Reset health tracking on successful reconnection
          needs_reauth: false,
          failure_count: 0,
          last_refresh_error: null,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          social_profile_id: social_profile_id || null,
          // Store additional metadata for the actual TikTok handle
          account_metadata: {
            tiktok_username: tiktokUsername,
            display_name: displayName,
            open_id: open_id,
          },
        }, {
          onConflict: "user_id,platform,platform_user_id",
        });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save account");
      }

      console.log("TikTok account saved successfully with display name:", usernameForDisplay, "handle:", tiktokUsername);

      return new Response(JSON.stringify({ success: true, username: usernameForDisplay }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get creator info - required for UX compliance per TikTok Content Sharing Guidelines
    if (action === "creator_info") {
      if (!account_id) {
        throw new Error("Missing account_id for creator_info");
      }

      console.log(`[${timestamp}] Fetching creator info for account: ${account_id}`);

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: account, error: fetchError } = await supabase
        .from("social_accounts")
        .select("access_token, platform_username, avatar_url")
        .eq("id", account_id)
        .single();

      if (fetchError || !account) {
        console.error(`[${timestamp}] Failed to fetch account:`, fetchError);
        throw new Error("Account not found");
      }

      // Fetch creator info from TikTok API (REQUIRED per Content Sharing Guidelines)
      const creatorInfoResponse = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const creatorData = await creatorInfoResponse.json();
      console.log(`[${timestamp}] Creator info response status: ${creatorInfoResponse.status}`);
      console.log(`[${timestamp}] Creator info data:`, JSON.stringify(creatorData));

      // REQUIRED: Check if creator has reached posting limit - block posting attempts
      let creatorPostingBlocked = false;
      let postingBlockedReason = "";
      
      // TikTok API returns error.code: "ok" for success, so check for actual errors
      if (creatorData.error && creatorData.error.code !== "ok") {
        const errorCode = creatorData.error.code;
        const errorMessage = creatorData.error.message || "Failed to get creator info";
        
        // REQUIRED per Content Sharing Guidelines: Stop posting if creator hit daily limit
        if (errorCode === "spam_risk_too_many_posts" || 
            errorCode === "spam_risk_user_banned_from_posting" ||
            errorCode === "user_posting_banned" ||
            errorMessage.toLowerCase().includes("posting limit") ||
            errorMessage.toLowerCase().includes("too many posts") ||
            errorMessage.toLowerCase().includes("cannot post")) {
          creatorPostingBlocked = true;
          postingBlockedReason = `You've reached your TikTok daily posting limit. Please try again later.`;
          console.log(`[${timestamp}] Creator posting is blocked: ${errorMessage}`);
        } else {
          console.error(`[${timestamp}] Creator info API error:`, JSON.stringify(creatorData.error));
          throw new Error(errorMessage);
        }
      }

      // Also fetch user info to get nickname (REQUIRED: Display creator's nickname)
      let creatorNickname = null;
      let creatorAvatarUrl = account.avatar_url;
      try {
        const userInfoResponse = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );
        const userData = await userInfoResponse.json();
        if (userData.data?.user) {
          creatorNickname = userData.data.user.display_name;
          creatorAvatarUrl = userData.data.user.avatar_url || account.avatar_url;
        }
        console.log(`[${timestamp}] User info fetched - nickname: ${creatorNickname}`);
      } catch (userInfoError) {
        console.warn(`[${timestamp}] Failed to fetch user info for nickname:`, userInfoError);
      }

      console.log(`[${timestamp}] Creator info retrieved successfully`);

      // Return the creator info which includes (per TikTok Content Sharing Guidelines):
      // - privacy_level_options: available privacy levels for this user (REQUIRED: must show only these options)
      // - comment_disabled: whether commenting is disabled (REQUIRED: grey out if disabled)
      // - duet_disabled: whether duet is disabled (REQUIRED: grey out if disabled)
      // - stitch_disabled: whether stitch is disabled (REQUIRED: grey out if disabled)
      // - max_video_post_duration_sec: max video duration (REQUIRED: validate video duration)
      // - daily_limit_total: total daily posting limit
      // - daily_limit_remaining: remaining posts for today
      // - creator_nickname: display name for the creator (REQUIRED: show which account posting to)
      // - creator_avatar_url: avatar URL (for UX display)
      // - creator_username: username (for UX display)
      // - creator_posting_blocked: whether posting is blocked (REQUIRED: stop posting if true)
      // - posting_blocked_reason: reason for blocking (for UX display)
      
      // Extract daily limit info if available
      const creatorInfoData = creatorData.data || creatorData;
      console.log(`[${timestamp}] Creator info fields: ${Object.keys(creatorInfoData).join(', ')}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        creator_info: {
          ...creatorInfoData,
          creator_nickname: creatorNickname,
          creator_avatar_url: creatorAvatarUrl,
          creator_username: account.platform_username,
          creator_posting_blocked: creatorPostingBlocked,
          posting_blocked_reason: postingBlockedReason,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token
    if (action === "refresh") {
      if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
        throw new Error("TikTok credentials not configured");
      }

      if (!account_id) {
        throw new Error("Missing account_id for token refresh");
      }

      console.log(`[${timestamp}] Refreshing TikTok token for account: ${account_id}`);

      // Fetch the current refresh token from database
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: account, error: fetchError } = await supabase
        .from("social_accounts")
        .select("refresh_token, platform_username")
        .eq("id", account_id)
        .single();

      if (fetchError || !account) {
        console.error(`[${timestamp}] Failed to fetch account:`, fetchError);
        throw new Error("Account not found");
      }

      if (!account.refresh_token) {
        throw new Error("No refresh token available for this account");
      }

      console.log(`[${timestamp}] Found account: ${account.platform_username}, refreshing token...`);

      const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log(`[${timestamp}] Token refresh response status: ${tokenResponse.status}`);

      if (tokenData.error) {
        console.error(`[${timestamp}] Token refresh error:`, JSON.stringify(tokenData.error));
        throw new Error(tokenData.error.message || tokenData.error_description || "Failed to refresh token");
      }

      const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      console.log(`[${timestamp}] Token refreshed, new expiry: ${newExpiresAt}`);

      const { error: updateError } = await supabase
        .from("social_accounts")
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account_id);

      if (updateError) {
        console.error(`[${timestamp}] Failed to update token:`, updateError);
        throw new Error("Failed to save refreshed token");
      }

      console.log(`[${timestamp}] TikTok token refresh successful for ${account.platform_username}`);

      return new Response(JSON.stringify({ success: true, expires_at: newExpiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ===== TikTok OAuth FATAL ERROR =====`);
    console.error(`[${timestamp}] Error type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`[${timestamp}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[${timestamp}] Full error:`, error);
    console.error(`[${timestamp}] =====================================`);
    
    // Return sanitized error message to prevent schema leakage
    return new Response(JSON.stringify({ error: "Authentication failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
