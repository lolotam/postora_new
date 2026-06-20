// Returns Meta's authoritative `recently_searched_keywords` for the connected Threads account.
// Per Meta docs: returns up to the last 7 days of search history performed via Keyword Search API
// with this app/user combination.
// https://developers.facebook.com/docs/threads/keyword-search

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
const REQUEST_SOURCE = "threads-recently-searched";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-recently-searched", "edge");
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

    let requestedAccountId: string | undefined;
    try {
      if (req.method !== "GET") {
        const body = await req.json().catch(() => ({}));
        if (body?.accountId) {
          const a = String(body.accountId).trim();
          if (a) requestedAccountId = a;
        }
      }
    } catch { /* ignore body parse */ }

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
      return structured({
        reason: "no_account",
        message: "No Threads account connected.",
        needsConnection: true,
      });
    }

    const preflight = await debugThreadsToken(account.access_token);
    if (!preflight.ok) {
      const cls = classifyMetaError({
        code: preflight.errorCode,
        error_subcode: preflight.errorSubcode,
        message: preflight.errorMessage,
        type: preflight.errorType,
      });
      return structured({
        reason: cls.reason === "unknown" ? "invalid_token" : cls.reason,
        message: cls.message || "Threads token preflight failed",
      });
    }

    const url = `https://graph.threads.net/v1.0/me?fields=recently_searched_keywords&access_token=${encodeURIComponent(account.access_token)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (data?.error) {
      const cls = classifyMetaError(data.error);
      await logger.warn("Threads recently-searched — Meta error", {
        event: "meta_error",
        platform: "threads",
        classified_reason: cls.reason,
        meta: cls,
      }, userId);
      return structured({
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
      });
    }

    // Meta returns: { recently_searched_keywords: { data: [{ query, search_time }] } }
    const rawList = data?.recently_searched_keywords?.data ?? data?.recently_searched_keywords ?? [];
    const items = (Array.isArray(rawList) ? rawList : []).map((r: any) => ({
      query: r?.query || r?.q || "",
      timestamp: r?.search_time || r?.timestamp || null,
    })).filter((r: { query: string }) => r.query);

    await logger.info("Threads recently-searched — success", {
      event: "fetched",
      platform: "threads",
      selected_account: summarizeAccount(account),
      count: items.length,
    }, userId);

    return ok({ items });
  } catch (error) {
    const errMsg = (error as Error).message || "Failed";
    await logger.error("Threads recently-searched — internal error", {
      event: "internal_error",
      error_message: errMsg,
    }, userId);
    return structured({ reason: "unknown", message: errMsg });
  }
});
