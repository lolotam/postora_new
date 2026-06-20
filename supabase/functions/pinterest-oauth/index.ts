import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheAvatarToCloudinary } from "../_shared/avatar-cache.ts";
import { authenticateCaller } from "../_shared/auth-helper.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PINTEREST_APP_ID = Deno.env.get("PINTEREST_CLIENT_ID");
const PINTEREST_APP_SECRET = Deno.env.get("PINTEREST_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { action, code, redirect_uri, social_profile_id, state } = body;

        console.log("Pinterest OAuth action:", action);

        // Generate authorization URL
        if (action === "authorize") {
            if (!PINTEREST_APP_ID) {
                throw new Error("PINTEREST_APP_ID not configured");
            }

            if (!redirect_uri) {
                throw new Error("Missing redirect_uri");
            }

            const scope = "pins:read,pins:write,boards:read,boards:write,user_accounts:read";
            const oauthState = state || crypto.randomUUID();
            const authUrl = `https://www.pinterest.com/oauth/?client_id=${PINTEREST_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(oauthState)}`;

            console.log("Generated Pinterest auth URL", { redirect_uri });

            return new Response(JSON.stringify({ url: authUrl, state: oauthState }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        // Handle OAuth callback - exchange code for tokens
        if (action === "callback") {
            // Validate caller identity
            const { userId: user_id } = await authenticateCaller(req, body.user_id);
            if (!code) {
                throw new Error("Missing code");
            }

            if (!PINTEREST_APP_ID || !PINTEREST_APP_SECRET) {
                throw new Error("Pinterest credentials not configured");
            }

            console.log("Exchanging code for access token");

            // Exchange code for access token
            console.log("Pinterest token exchange params:", { code: code.substring(0, 10) + "...", redirect_uri });
            
            const tokenResponse = await fetch("https://api.pinterest.com/v5/oauth/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${btoa(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: redirect_uri,
                }),
            });

            const tokenData = await tokenResponse.json();
            console.log("Token response status:", tokenResponse.status, "data:", JSON.stringify(tokenData));

            if (tokenData.error || !tokenResponse.ok) {
                console.error("Pinterest token error:", tokenData);
                throw new Error(tokenData.message || tokenData.error_description || tokenData.error || "Failed to get access token");
            }

            const { access_token, refresh_token, expires_in, scope } = tokenData;

            // Get user info from Pinterest
            const userResponse = await fetch("https://api.pinterest.com/v5/user_account", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });

            const userData = await userResponse.json();
            console.log("User info response status:", userResponse.status);

            if (!userResponse.ok) {
                throw new Error(userData.message || "Failed to get user info");
            }

            const username = userData.username || userData.id;
            const rawAvatarUrl = userData.profile_image;

            // Determine access level based on granted scopes
            const grantedScopes = scope || tokenData.scopes || "";
            const hasWriteAccess = grantedScopes.includes("pins:write") || grantedScopes.includes("boards:write");
            const accessLevel = hasWriteAccess ? "standard" : "trial";
            console.log("Pinterest scopes granted:", grantedScopes, "Access level:", accessLevel);

            // Store in database
            const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

            const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

            // Cache avatar to Cloudinary for permanent storage
            const avatarUrl = await cacheAvatarToCloudinary(rawAvatarUrl, user_id, "pinterest", userData.id);

            const { error: dbError } = await supabase
                .from("social_accounts")
                .upsert({
                    user_id: user_id,
                    platform: "pinterest",
                    platform_user_id: userData.id,
                    platform_username: username,
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
                    account_metadata: {
                        business_type: userData.account_type,
                        has_write_access: hasWriteAccess,
                        access_level: accessLevel,
                        granted_scopes: grantedScopes,
                    },
                }, {
                    onConflict: "user_id,platform,platform_user_id",
                });

            if (dbError) {
                console.error("Database error:", dbError);
                throw new Error("Failed to save account");
            }

            console.log("Pinterest account saved successfully");

            return new Response(JSON.stringify({ success: true, username }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Refresh token
        if (action === "refresh") {
            if (!PINTEREST_APP_ID || !PINTEREST_APP_SECRET) {
                throw new Error("Pinterest credentials not configured");
            }

            const { refresh_token: currentRefreshToken, account_id } = body;

            const tokenResponse = await fetch("https://api.pinterest.com/v5/oauth/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${btoa(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: currentRefreshToken,
                }),
            });

            const tokenData = await tokenResponse.json();

            if (tokenData.error || !tokenResponse.ok) {
                throw new Error(tokenData.message || tokenData.error || "Failed to refresh token");
            }

            const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

            await supabase
                .from("social_accounts")
                .update({
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token || currentRefreshToken,
                    token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", account_id);

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: unknown) {
        console.error("Pinterest OAuth error:", error);
        // Return sanitized error message to prevent schema leakage
        return new Response(JSON.stringify({ error: "Authentication failed. Please try again." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
