import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheAvatarToCloudinary } from "../_shared/avatar-cache.ts";
import { authenticateCaller } from "../_shared/auth-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const THREADS_APP_ID = Deno.env.get("THREADS_APP_ID")!;
const THREADS_APP_SECRET = Deno.env.get("THREADS_APP_SECRET")!;

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

      // Guard: fail fast with a clear message if the Threads app secret is missing/empty,
      // instead of producing a broken authorize URL that bounces the user to Meta's error page.
      if (!THREADS_APP_ID || THREADS_APP_ID.trim() === "") {
        console.error(JSON.stringify({
          event: "threads_oauth_missing_app_id",
          user_id,
        }));
        return new Response(
          JSON.stringify({ error: "Threads app is not configured. Contact admin." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Threads OAuth scopes — request ALL granular permissions the app supports.
      // IMPORTANT: Each scope here MUST also be added in the Meta App Dashboard under
      // "Threads API > Permissions and Features" — Meta silently drops scopes that
      // aren't enabled at the app level, which is why missing toggles do not appear
      // on the consent screen even when requested here.
      const scopeList = [
        "threads_basic",
        "threads_content_publish",
        "threads_manage_insights",
        "threads_profile_discovery",
        "threads_keyword_search",
        "threads_location_tagging",
        "threads_share_to_instagram",
        "threads_delete",
        "threads_manage_mentions",
        "threads_read_replies",
        "threads_manage_replies",
      ];
      const scopes = scopeList.join(",");

      const state = btoa(JSON.stringify({
        user_id,
        social_profile_id,
        return_to: return_to || redirect_uri,
      }));

      // Build URL manually so commas in `scope` stay literal (Meta's docs use raw commas).
      const authUrl = `https://threads.net/oauth/authorize`
        + `?client_id=${encodeURIComponent(THREADS_APP_ID)}`
        + `&redirect_uri=${encodeURIComponent(return_to || redirect_uri)}`
        + `&scope=${scopes}`
        + `&response_type=code`
        + `&state=${encodeURIComponent(state)}`;

      // Structured log so /admin/logs can detect future credential drift at a glance.
      // Only the first 6 chars of the app ID are recorded for safety.
      console.log(JSON.stringify({
        event: "threads_oauth_authorize_url_built",
        app_id_prefix: THREADS_APP_ID.slice(0, 6),
        redirect_uri: return_to || redirect_uri,
        scopes: scopeList,
        user_id,
      }));

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const { userId: user_id } = await authenticateCaller(req, body.user_id);
      console.log("Processing Threads OAuth callback for user:", user_id);

      // Exchange code for access token
      const tokenResponse = await fetch("https://graph.threads.net/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: THREADS_APP_ID,
          client_secret: THREADS_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: redirect_uri,
          code: code,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log("Threads token response:", JSON.stringify(tokenData).slice(0, 200));

      if (tokenData.error) {
        throw new Error(`Threads OAuth error: ${tokenData.error_message || tokenData.error}`);
      }

      const accessToken = tokenData.access_token;
      const tokenUserId = tokenData.user_id; // May be corrupted due to large number precision loss

      // Meta's short-lived token response includes a `permissions` field listing the
      // scopes the user actually granted on the consent screen. We use this as the
      // authoritative source of granted scopes (separate from what we *requested*).
      // Format: comma-separated string OR array depending on API version.
      const tokenPermissionsRaw = tokenData.permissions;
      const tokenGrantedScopes: string[] = Array.isArray(tokenPermissionsRaw)
        ? tokenPermissionsRaw.map((s: any) => String(s).trim()).filter(Boolean)
        : typeof tokenPermissionsRaw === "string"
          ? tokenPermissionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      console.log("Threads token-reported permissions:", JSON.stringify(tokenGrantedScopes));

      // Get long-lived access token
      const longLivedResponse = await fetch(
        `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${THREADS_APP_SECRET}&access_token=${accessToken}`
      );
      const longLivedData = await longLivedResponse.json();
      
      const finalAccessToken = longLivedData.access_token || accessToken;
      const expiresIn = longLivedData.expires_in || 5184000; // 60 days default

      // Get user profile
      const profileResponse = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${finalAccessToken}`
      );
      const profileData = await profileResponse.json();
      console.log("Threads profile:", JSON.stringify(profileData).slice(0, 200));

      const safeUserId = profileData.id; // String from /me endpoint - preserves full precision
      const username = profileData.username || `threads_${safeUserId}`;
      const rawAvatarUrl = profileData.threads_profile_picture_url;

      // Cache avatar to Cloudinary for permanent storage
      const avatarUrl = await cacheAvatarToCloudinary(rawAvatarUrl, user_id, "threads", safeUserId);

      console.log("Using safe user ID from /me endpoint:", safeUserId, "(token user_id was:", tokenUserId, ")");

      // Probe granted permissions/capabilities so the UI can tell what this token can do.
      // IMPORTANT: classify failures. Only set capability=false when Meta explicitly says the
      // permission/scope is missing/unapproved. For any other failure (transient, no data,
      // unrelated error), set the capability to null (unknown) so the UI does not destructively
      // flag the feature as unavailable.
      const grantedScopes: string[] = [];
      type ProbeOutcome = { ok: boolean; capability: boolean | null; code?: number; subcode?: number; message?: string };
      const capabilityProbe: Record<string, ProbeOutcome> = {};

      function classifyProbe(j: any): ProbeOutcome {
        if (!j?.error) return { ok: true, capability: true };
        const code: number | undefined = j.error.code;
        const subcode: number | undefined = j.error.error_subcode;
        const message: string = (j.error.message || j.error.error_user_msg || "").toString();
        const lower = message.toLowerCase();
        // Code 10 with permission/scope/approval wording → verified missing
        if (code === 10 && (lower.includes("permission") || lower.includes("scope") || lower.includes("approved") || lower.includes("unapproved") || lower.includes("review"))) {
          return { ok: false, capability: false, code, subcode, message };
        }
        // Token errors → unknown (capability may still exist; we just can't verify)
        // Anything else → unknown
        return { ok: false, capability: null, code, subcode, message };
      }

      try {
        const r = await fetch(`https://graph.threads.net/v1.0/${safeUserId}/threads_insights?metric=views&access_token=${finalAccessToken}`);
        capabilityProbe.insights = classifyProbe(await r.json());
        if (capabilityProbe.insights.capability === true) grantedScopes.push("threads_manage_insights");
      } catch (e) {
        capabilityProbe.insights = { ok: false, capability: null, message: (e as Error).message };
      }

      try {
        const r = await fetch(`https://graph.threads.net/v1.0/profile_posts?username=${encodeURIComponent(username)}&fields=id&limit=1&access_token=${finalAccessToken}`);
        capabilityProbe.discovery = classifyProbe(await r.json());
        if (capabilityProbe.discovery.capability === true) grantedScopes.push("threads_profile_discovery");
      } catch (e) {
        capabilityProbe.discovery = { ok: false, capability: null, message: (e as Error).message };
      }

      try {
        const r = await fetch(`https://graph.threads.net/v1.0/keyword_search?q=${encodeURIComponent(username)}&fields=id&limit=1&access_token=${finalAccessToken}`);
        capabilityProbe.keyword_search = classifyProbe(await r.json());
        if (capabilityProbe.keyword_search.capability === true) grantedScopes.push("threads_keyword_search");
      } catch (e) {
        capabilityProbe.keyword_search = { ok: false, capability: null, message: (e as Error).message };
      }

      try {
        // Probe with richer fields so we can fingerprint Meta's sandbox sample data.
        const r = await fetch(
          `https://graph.threads.net/v1.0/location_search?q=coffee&fields=id,name,city,country,address&access_token=${finalAccessToken}`,
        );
        const probeJson = await r.json();
        capabilityProbe.location_tagging = classifyProbe(probeJson);
        // If Meta accepted the call but returned the Menlo Park sandbox dataset, the scope
        // is granted at OAuth level but Advanced Access has not been approved yet.
        if (capabilityProbe.location_tagging.capability === true) {
          const rows = Array.isArray(probeJson?.data) ? probeJson.data : [];
          const { isThreadsLocationSampleData } = await import("../_shared/threads-debug.ts");
          if (isThreadsLocationSampleData(rows, "coffee")) {
            capabilityProbe.location_tagging = {
              ok: false,
              capability: false,
              message: "Sample data only — awaiting Advanced Access approval for threads_location_tagging.",
            };
          } else {
            grantedScopes.push("threads_location_tagging");
          }
        }
      } catch (e) {
        capabilityProbe.location_tagging = { ok: false, capability: null, message: (e as Error).message };
      }

      // Cross-share to Instagram and Delete cannot be safely dry-run.
      // Default to null (unknown) — first publish/delete attempt will classify the real outcome.
      capabilityProbe.share_to_instagram = { ok: true, capability: null, message: "Verified on first publish" };
      capabilityProbe.delete_posts = { ok: true, capability: null, message: "Verified on first delete attempt" };

      // ── share_to_instagram: verify against token-reported permissions ──
      // Meta returns the granted scopes in the token exchange response. If
      // `threads_share_to_instagram` is in that list, the user approved it.
      // If the list is non-empty but the scope is missing, the user (or Meta)
      // declined it — mark capability=false so the UI hard-disables the toggle.
      if (tokenGrantedScopes.length > 0) {
        if (tokenGrantedScopes.includes("threads_share_to_instagram")) {
          capabilityProbe.share_to_instagram = {
            ok: true,
            capability: true,
            message: "Granted at OAuth consent",
          };
          grantedScopes.push("threads_share_to_instagram");
        } else {
          capabilityProbe.share_to_instagram = {
            ok: false,
            capability: false,
            message: "Scope not granted by Meta — reconnect Threads or enable threads_share_to_instagram in Meta App Dashboard.",
          };
        }
      }
      // If tokenGrantedScopes is empty (older API or missing field), keep capability=null.

      // Probe mentions: requires threads_manage_mentions. Cheap read on /me/mentions.
      try {
        const r = await fetch(
          `https://graph.threads.net/v1.0/me/mentions?fields=id&limit=1&access_token=${finalAccessToken}`,
        );
        capabilityProbe.mentions = classifyProbe(await r.json());
        if (capabilityProbe.mentions.capability === true) grantedScopes.push("threads_manage_mentions");
      } catch (e) {
        capabilityProbe.mentions = { ok: false, capability: null, message: (e as Error).message };
      }

      grantedScopes.push("threads_basic", "threads_content_publish");

      // Mirror remaining token-reported scopes into grantedScopes so the admin
      // dashboard reflects what Meta actually returned, not just what we probed.
      for (const s of tokenGrantedScopes) {
        if (!grantedScopes.includes(s)) grantedScopes.push(s);
      }

      console.log("Threads capability probe:", JSON.stringify(capabilityProbe));

      const accountMetadata = {
        granted_scopes: Array.from(new Set(grantedScopes)),
        capability_probe: capabilityProbe,
        capabilities: {
          canPublish: true,
          canViewInsights: capabilityProbe.insights.capability,
          canUseDiscovery: capabilityProbe.discovery.capability,
          canUseKeywordSearch: capabilityProbe.keyword_search.capability,
          canUseLocationTagging: capabilityProbe.location_tagging.capability,
          locationTaggingReason:
            capabilityProbe.location_tagging.capability === false &&
            String(capabilityProbe.location_tagging.message || "").toLowerCase().includes("sample data")
              ? "awaiting_advanced_access"
              : null,
          canCrossShareToIg: capabilityProbe.share_to_instagram.capability,
          canDeleteThreadsPosts: capabilityProbe.delete_posts.capability,
          canManageMentions: capabilityProbe.mentions?.capability ?? null,
        },
        capability_probed_at: new Date().toISOString(),
      };

      // Atomic upsert - prevents race conditions and ensures only 1 row per user/platform/account
      const { error: dbError } = await supabase
        .from("social_accounts")
        .upsert(
          {
            user_id,
            platform: "threads",
            platform_user_id: safeUserId,
            platform_username: username,
            avatar_url: avatarUrl,
            access_token: finalAccessToken,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            is_active: true,
            social_profile_id,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            account_metadata: accountMetadata,
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
        throw new Error("Failed to save Threads account");
      }

      console.log("Threads account saved successfully via atomic upsert");

      return new Response(JSON.stringify({ success: true, username }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Threads OAuth error:", error);
    // Return sanitized error message to prevent schema leakage
    return new Response(
      JSON.stringify({ error: "Authentication failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
