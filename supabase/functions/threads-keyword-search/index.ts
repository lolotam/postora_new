import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logging.ts";
import {
  getThreadsAccount,
  summarizeAccount,
  debugThreadsToken,
  classifyMetaError,
} from "../_shared/threads-debug.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUEST_SOURCE = "threads-keyword-search";

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, requestSource: REQUEST_SOURCE, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function structured(body: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: false, requestSource: REQUEST_SOURCE, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-keyword-search", "edge");
  let searchKeyword = "";
  let userId: string | undefined;
  let searchType: "TOP" | "RECENT" = "TOP";
  let since: string | undefined;
  let until: string | undefined;
  let cursor: string | undefined;
  let requestedAccountId: string | undefined;

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

    const body = await req.json();
    const { keyword } = body;
    if (!keyword || String(keyword).trim().length < 2) throw new Error("Keyword must be at least 2 characters");
    searchKeyword = String(keyword).trim();

    if (body?.accountId) {
      const a = String(body.accountId).trim();
      if (a) requestedAccountId = a;
    }

    // Optional params
    const rawType = String(body?.searchType || "TOP").toUpperCase();
    searchType = rawType === "RECENT" ? "RECENT" : "TOP";
    cursor = body?.cursor ? String(body.cursor) : undefined;

    // New: search_mode (KEYWORD | TAG), media_type, limit, author_username
    const rawMode = String(body?.searchMode || "KEYWORD").toUpperCase();
    const searchMode: "KEYWORD" | "TAG" = rawMode === "TAG" ? "TAG" : "KEYWORD";
    const rawMedia = String(body?.mediaType || "ALL").toUpperCase();
    const mediaType: "ALL" | "TEXT" | "IMAGE" | "VIDEO" =
      rawMedia === "TEXT" || rawMedia === "IMAGE" || rawMedia === "VIDEO" ? rawMedia : "ALL";
    let pageLimit = 25;
    const rawLimit = Number(body?.limit);
    if (Number.isFinite(rawLimit)) pageLimit = Math.max(1, Math.min(100, Math.floor(rawLimit)));
    let authorUsername: string | undefined;
    if (body?.authorUsername) {
      const a = String(body.authorUsername).trim().replace(/^@+/, "").toLowerCase();
      const cleaned = a.replace(/[^a-z0-9._]/g, "");
      if (cleaned.length >= 2) authorUsername = cleaned;
    }

    if (body?.since) {
      const s = String(body.since);
      if (!isValidYmd(s)) return structured({ reason: "unknown", message: "Invalid 'since' date (use YYYY-MM-DD)" });
      since = s;
    }
    if (body?.until) {
      const u = String(body.until);
      if (!isValidYmd(u)) return structured({ reason: "unknown", message: "Invalid 'until' date (use YYYY-MM-DD)" });
      until = u;
    }
    if (since && until && since > until) {
      return structured({ reason: "unknown", message: "'since' must be on or before 'until'" });
    }

    let account = null as Awaited<ReturnType<typeof getThreadsAccount>>;
    if (requestedAccountId) {
      const { data: rows } = await supabase
        .from("social_accounts")
        .select("id, user_id, platform_user_id, platform_username, access_token, connected_at, updated_at, token_expires_at")
        .eq("id", requestedAccountId)
        .eq("user_id", userId)
        .eq("platform", "threads")
        .eq("is_active", true)
        .limit(1);
      if (rows && rows.length > 0) account = rows[0] as any;
    }
    if (!account) {
      account = await getThreadsAccount(supabase, userId);
    }
    if (!account?.access_token) {
      await logger.warn("No Threads account connected for keyword search", {
        event: "no_account",
        platform: "threads",
        keyword: searchKeyword,
      }, userId);
      return structured({
        reason: "no_account",
        message: "No Threads account connected. Please connect your Threads account first.",
        needsConnection: true,
      });
    }

    const acctSummary = summarizeAccount(account);
    await logger.info("Threads Keyword Search — selected account", {
      event: "selected_account",
      platform: "threads",
      keyword: searchKeyword,
      search_type: searchType,
      search_mode: searchMode,
      media_type: mediaType,
      limit: pageLimit,
      author_username: authorUsername,
      since,
      until,
      has_cursor: !!cursor,
      selected_account: acctSummary,
    }, userId);

    const preflight = await debugThreadsToken(account.access_token);
    await logger.info("Threads Keyword Search — preflight /me", {
      event: "preflight_me",
      platform: "threads",
      preflight_me: preflight,
    }, userId);

    if (!preflight.ok) {
      const cls = classifyMetaError({
        code: preflight.errorCode,
        error_subcode: preflight.errorSubcode,
        message: preflight.errorMessage,
        type: preflight.errorType,
      });
      await logger.error("Threads Keyword Search — preflight failed", {
        event: "preflight_failed",
        platform: "threads",
        classified_reason: cls.reason,
        meta: cls,
      }, userId);
      const needsReauth = cls.reason === "invalid_token" || cls.reason === "expired_token";
      return structured({
        reason: needsReauth ? cls.reason : (cls.reason === "unknown" ? "invalid_token" : cls.reason),
        message: cls.message || "Threads token preflight failed",
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsReauth,
      });
    }

    const fields = "id,text,username,timestamp,permalink,media_type,media_url,thumbnail_url,has_replies,is_quote_post,is_reply";
    const params = new URLSearchParams();
    params.set("q", searchKeyword);
    params.set("fields", fields);
    params.set("limit", String(pageLimit));
    params.set("search_type", searchType);
    params.set("search_mode", searchMode);
    if (mediaType !== "ALL") params.set("media_type", mediaType);
    if (authorUsername) params.set("author_username", authorUsername);
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    if (cursor) params.set("after", cursor);

    const queryNoToken = params.toString();
    const apiUrl = `https://graph.threads.net/v1.0/keyword_search?${queryNoToken}&access_token=${encodeURIComponent(account.access_token)}`;

    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json().catch(() => ({}));

    const nextCursor: string | undefined = apiData?.paging?.cursors?.after;
    const hasMore = !!apiData?.paging?.next || !!nextCursor;

    await logger.info("Threads Keyword Search — live request", {
      event: "live_request",
      platform: "threads",
      keyword: searchKeyword,
      endpoint: "/v1.0/keyword_search",
      search_type: searchType,
      search_mode: searchMode,
      media_type: mediaType,
      limit: pageLimit,
      author_username: authorUsername,
      since,
      until,
      has_cursor_in: !!cursor,
      query_no_token: queryNoToken,
      meta_status: apiResponse.status,
      results_count: Array.isArray(apiData?.data) ? apiData.data.length : 0,
      has_more: hasMore,
      next_cursor_present: !!nextCursor,
      error_code: apiData?.error?.code,
      error_message: apiData?.error?.message,
    }, userId);

    if (apiData?.error) {
      const cls = classifyMetaError(apiData.error);
      await logger.warn("Threads Keyword Search — Meta returned error", {
        event: "meta_error",
        platform: "threads",
        keyword: searchKeyword,
        classified_reason: cls.reason,
        meta: cls,
      }, userId);

      return structured({
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsPermission: cls.reason === "permission_not_approved" || cls.reason === "missing_scope",
        needsReauth: cls.reason === "invalid_token" || cls.reason === "expired_token",
      });
    }

    const results = (apiData.data || []).map((post: any) => ({
      id: post.id,
      text: post.text || "",
      username: post.username || "",
      timestamp: post.timestamp || "",
      permalink: post.permalink || "",
      mediaType: post.media_type || "TEXT_POST",
      mediaUrl: post.media_url || "",
      thumbnailUrl: post.thumbnail_url || "",
      hasReplies: !!post.has_replies,
      isQuotePost: !!post.is_quote_post,
      isReply: !!post.is_reply,
    }));

    return ok({
      results,
      query: searchKeyword,
      searchType,
      searchMode,
      mediaType,
      limit: pageLimit,
      authorUsername: authorUsername || null,
      since: since || null,
      until: until || null,
      hasMore,
      nextCursor: nextCursor || null,
      totalResultsReturned: results.length,
    });
  } catch (error) {
    const errMsg = (error as Error).message || "Keyword search failed";
    await logger.error("Threads Keyword Search — internal error", {
      event: "keyword_search_internal_error",
      platform: "threads",
      keyword: searchKeyword || "unknown",
      error_message: errMsg,
      error_stack: (error as Error).stack,
    }, userId);
    return structured({ reason: "unknown", message: errMsg });
  }
});
