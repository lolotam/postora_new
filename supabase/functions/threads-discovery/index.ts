import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logging.ts";
import {
  getThreadsAccount,
  summarizeAccount,
  debugThreadsToken,
  classifyMetaError,
  fetchOwnThreads,
} from "../_shared/threads-debug.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function structured(body: Record<string, unknown>) {
  // Always 200; client reads `ok` flag. This prevents the runtime overlay from intercepting non-2xx.
  return new Response(JSON.stringify({ ok: false, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapThreadsMediaType(type: string): string {
  switch ((type || "").toUpperCase()) {
    case "TEXT_POST": return "TEXT";
    case "IMAGE": return "IMAGE";
    case "VIDEO": return "VIDEO";
    case "CAROUSEL_ALBUM": return "CAROUSEL";
    default: return "TEXT";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-discovery", "edge");
  let cleanUsername = "";
  let userId: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");
    userId = claimsData.claims.sub as string;

    const { username } = await req.json();
    if (!username) throw new Error("Username is required");
    cleanUsername = String(username).replace("@", "").toLowerCase().trim();

    // 1) Account selection (most recent reconnect wins)
    const account = await getThreadsAccount(supabase, userId);
    if (!account?.access_token) {
      await logger.warn("No Threads account connected", {
        event: "no_account",
        platform: "threads",
        target_username: cleanUsername,
      }, userId);
      return structured({
        reason: "no_account",
        message: "No Threads account connected. Please connect your Threads account first.",
        needsConnection: true,
      });
    }

    const acctSummary = summarizeAccount(account);
    await logger.info("Threads Discovery — selected account", {
      event: "selected_account",
      platform: "threads",
      target_username: cleanUsername,
      selected_account: acctSummary,
    }, userId);

    // 2) Preflight `/me` to verify the token is alive and identify the actual Threads identity
    const preflight = await debugThreadsToken(account.access_token);
    await logger.info("Threads Discovery — preflight /me", {
      event: "preflight_me",
      platform: "threads",
      preflight_me: preflight,
      stored_username: account.platform_username,
    }, userId);

    if (!preflight.ok) {
      const cls = classifyMetaError({
        code: preflight.errorCode,
        error_subcode: preflight.errorSubcode,
        message: preflight.errorMessage,
        type: preflight.errorType,
      });
      await logger.error("Threads Discovery — preflight failed", {
        event: "preflight_failed",
        platform: "threads",
        target_username: cleanUsername,
        classified_reason: cls.reason,
        meta: cls,
        final_status_returned_to_client: 200,
      }, userId);

      // Token-related preflight failures → ask user to reconnect
      const needsReauth = cls.reason === "invalid_token" || cls.reason === "expired_token";
      return structured({
        reason: needsReauth ? cls.reason : (cls.reason === "unknown" ? "invalid_token" : cls.reason),
        message: cls.message || "Threads token preflight failed",
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsReauth,
      });
    }

    // 3) Identity-aware branch selection
    const authedUsername = (preflight.threadsUsername || "").toLowerCase().trim();
    const authedUserId = preflight.threadsUserId || "";
    const isOwnAccount =
      !!authedUsername &&
      !!authedUserId &&
      authedUsername === cleanUsername;
    const branch = isOwnAccount ? "own_account_posts" : "public_profile_discovery";

    await logger.info("Threads Discovery — branch selected", {
      event: "branch_selected",
      platform: "threads",
      authenticated_username: authedUsername,
      authenticated_user_id: authedUserId,
      searched_username: cleanUsername,
      branch,
    }, userId);

    // Enrich profile (pic, name, bio) — only available for the authenticated user.
    let meEnrich: { profilePicUrl: string; fullName: string; bio: string } = {
      profilePicUrl: "", fullName: "", bio: "",
    };
    try {
      const meRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${encodeURIComponent(account.access_token)}`,
      );
      const meJson = await meRes.json().catch(() => ({}));
      if (meJson && !meJson.error) {
        meEnrich = {
          profilePicUrl: meJson.threads_profile_picture_url || "",
          fullName: meJson.name || meJson.username || "",
          bio: meJson.threads_biography || "",
        };
      }
    } catch { /* non-fatal */ }

    // ===== Branch A: own-account posts (uses /{id}/threads, only needs threads_basic) =====
    if (isOwnAccount) {
      const endpoint = `/v1.0/${authedUserId}/threads`;
      const result = await fetchOwnThreads(account.access_token, authedUserId, 25);

      await logger.info("Threads Discovery — live request (own account)", {
        event: "live_request",
        platform: "threads",
        branch,
        searched_username: cleanUsername,
        authenticated_username: authedUsername,
        endpoint,
        meta_status: result.status,
        live_response_preview: {
          has_data: Array.isArray(result.data),
          data_length: result.data?.length || 0,
          error_code: result.error?.code,
          error_subcode: result.error?.error_subcode,
          error_message: result.error?.message,
          error_type: result.error?.type,
        },
      }, userId);

      if (!result.ok) {
        const cls = classifyMetaError(result.error || {});
        await logger.warn("Threads Discovery — own-account error", {
          event: "meta_error",
          platform: "threads",
          branch,
          searched_username: cleanUsername,
          endpoint,
          classified_reason: cls.reason,
          meta: cls,
          final_status_returned_to_client: 200,
        }, userId);
        return structured({
          branch,
          reason: cls.reason,
          message: cls.message || "Failed to read your own Threads posts",
          meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
          // Own-account branch never asks for Profile Discovery scope.
          needsReauth: cls.reason === "invalid_token" || cls.reason === "expired_token",
        });
      }

      const posts = (result.data || []).map((post: any) => ({
        id: post.id,
        shortcode: post.shortcode || post.id,
        mediaType: mapThreadsMediaType(post.media_type),
        mediaUrl: post.media_url || "",
        thumbnailUrl: post.thumbnail_url || post.media_url || "",
        caption: post.text || "",
        timestamp: post.timestamp || new Date().toISOString(),
        permalink: post.permalink || "",
        likesCount: 0,
        commentsCount: 0,
        videoViewCount: 0,
        sharesCount: 0,
        savesCount: 0,
        engagementScore: 0,
        username: post.username || authedUsername,
        isQuotePost: post.is_quote_post || false,
      }));

      const profile = {
        username: authedUsername,
        fullName: meEnrich.fullName || authedUsername,
        profilePicUrl: meEnrich.profilePicUrl,
        bio: meEnrich.bio,
        followersCount: 0,
        followingCount: 0,
        postsCount: posts.length,
        platform: "threads",
        isVerified: false,
      };

      try {
        await supabase.from("brand_scrape_sessions").insert({
          user_id: userId,
          platform: "threads",
          username: cleanUsername,
          profile_data: profile,
          posts_data: posts,
          total_posts_fetched: posts.length,
          strategy_used: "threads_own_account_posts",
          api_endpoint: `graph.threads.net${endpoint}`,
          scraped_at: new Date().toISOString(),
        });
      } catch (_) { /* non-fatal */ }

      await logger.info(`Threads Discovery (own) completed for @${cleanUsername}`, {
        event: "discovery_success",
        platform: "threads",
        branch,
        posts_count: posts.length,
        final_status_returned_to_client: 200,
      }, userId);

      return ok({
        branch,
        profile,
        posts,
        totalPosts: posts.length,
        hasMore: false,
        strategy: "threads_own_account_posts",
      });
    }

    // ===== Branch B: public profile discovery (needs threads_profile_discovery scope) =====
    const endpoint = "/v1.0/profile_posts";
    const fields = "id,media_type,media_url,permalink,username,text,timestamp,shortcode,thumbnail_url,is_quote_post";
    const queryNoToken = `username=${encodeURIComponent(cleanUsername)}&fields=${fields}&limit=25`;
    const apiUrl = `https://graph.threads.net${endpoint}?${queryNoToken}&access_token=${encodeURIComponent(account.access_token)}`;

    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json().catch(() => ({}));

    await logger.info("Threads Discovery — live request (public)", {
      event: "live_request",
      platform: "threads",
      branch,
      authenticated_username: authedUsername,
      searched_username: cleanUsername,
      endpoint,
      query_no_token: queryNoToken,
      meta_status: apiResponse.status,
      live_response_preview: {
        has_data: Array.isArray(apiData?.data),
        data_length: Array.isArray(apiData?.data) ? apiData.data.length : 0,
        error_code: apiData?.error?.code,
        error_subcode: apiData?.error?.error_subcode,
        error_message: apiData?.error?.message,
        error_type: apiData?.error?.type,
      },
    }, userId);

    if (apiData?.error) {
      const cls = classifyMetaError(apiData.error);
      await logger.warn("Threads Discovery — Meta returned error", {
        event: "meta_error",
        platform: "threads",
        branch,
        searched_username: cleanUsername,
        endpoint,
        classified_reason: cls.reason,
        meta: cls,
        final_status_returned_to_client: 200,
      }, userId);

      return structured({
        branch,
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsPermission: cls.reason === "permission_not_approved" || cls.reason === "missing_scope",
        needsReauth: cls.reason === "invalid_token" || cls.reason === "expired_token",
      });
    }

    const posts = (apiData.data || []).map((post: any) => ({
      id: post.id,
      shortcode: post.shortcode || post.id,
      mediaType: mapThreadsMediaType(post.media_type),
      mediaUrl: post.media_url || "",
      thumbnailUrl: post.thumbnail_url || post.media_url || "",
      caption: post.text || "",
      timestamp: post.timestamp || new Date().toISOString(),
      permalink: post.permalink || "",
      likesCount: 0,
      commentsCount: 0,
      videoViewCount: 0,
      sharesCount: 0,
      savesCount: 0,
      engagementScore: 0,
      username: post.username || cleanUsername,
      isQuotePost: post.is_quote_post || false,
    }));

    const profile = {
      username: cleanUsername,
      fullName: cleanUsername,
      profilePicUrl: "",
      bio: "",
      followersCount: 0,
      followingCount: 0,
      postsCount: posts.length,
      platform: "threads",
      isVerified: false,
    };

    try {
      await supabase.from("brand_scrape_sessions").insert({
        user_id: userId,
        platform: "threads",
        username: cleanUsername,
        profile_data: profile,
        posts_data: posts,
        total_posts_fetched: posts.length,
        strategy_used: "threads_discovery_api",
        api_endpoint: `graph.threads.net${endpoint}`,
        scraped_at: new Date().toISOString(),
      });
    } catch (histErr) {
      await logger.warn("Failed to save discovery session", {
        event: "session_save_failed",
        platform: "threads",
        branch,
        target_username: cleanUsername,
        error_message: (histErr as Error).message,
      }, userId);
    }

    await logger.info(`Threads Discovery (public) completed for @${cleanUsername}`, {
      event: "discovery_success",
      platform: "threads",
      branch,
      posts_count: posts.length,
      final_status_returned_to_client: 200,
    }, userId);

    return ok({
      branch,
      profile,
      posts,
      totalPosts: posts.length,
      hasMore: false,
      strategy: "threads_discovery_api",
    });

  } catch (error) {
    const errMsg = (error as Error).message || "Discovery failed";
    await logger.error("Threads Discovery — internal error", {
      event: "discovery_internal_error",
      platform: "threads",
      target_username: cleanUsername || "unknown",
      error_message: errMsg,
      error_stack: (error as Error).stack,
      final_status_returned_to_client: 200,
    }, userId);

    return structured({
      reason: "unknown",
      message: errMsg,
    });
  }
});
