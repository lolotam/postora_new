// Reposts an existing public Threads post.
// Endpoint: POST /v1.0/{threads-user-id}/repost?repost_id={post_id}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logging.ts";
import {
  summarizeAccount,
  debugThreadsToken,
  classifyMetaError,
  type SelectedThreadsAccount,
} from "../_shared/threads-debug.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUEST_SOURCE = "threads-repost";

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
  const logger = createLogger(supabase, "threads-repost", "edge");
  let userId: string | undefined;
  let repostId = "";

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
    repostId = String(body?.post_id || body?.repost_id || "").trim();
    const directAccountId: string | undefined = body?.social_account_id;

    if (!repostId) return structured({ reason: "unknown", message: "Missing post_id" });

    let account: SelectedThreadsAccount | null = null;
    if (directAccountId) {
      const { data: acc } = await supabase
        .from("social_accounts")
        .select("id, user_id, platform_user_id, platform_username, access_token, connected_at, updated_at, token_expires_at")
        .eq("id", directAccountId)
        .eq("user_id", userId)
        .eq("platform", "threads")
        .maybeSingle();
      if (acc) account = acc as SelectedThreadsAccount;
    }
    if (!account) {
      const { data: list } = await supabase
        .from("social_accounts")
        .select("id, user_id, platform_user_id, platform_username, access_token, connected_at, updated_at, token_expires_at")
        .eq("user_id", userId)
        .eq("platform", "threads")
        .eq("is_active", true)
        .order("connected_at", { ascending: false, nullsFirst: false })
        .limit(1);
      if (list && list.length > 0) account = list[0] as SelectedThreadsAccount;
    }
    if (!account?.access_token) {
      return structured({
        reason: "no_account",
        message: "No Threads account connected to repost with.",
        needsConnection: true,
      });
    }

    await logger.info("Threads repost — selected account", {
      event: "selected_account",
      platform: "threads",
      repost_id: repostId,
      selected_account: summarizeAccount(account),
    }, userId);

    const preflight = await debugThreadsToken(account.access_token);
    if (!preflight.ok) {
      const cls = classifyMetaError({
        code: preflight.errorCode,
        error_subcode: preflight.errorSubcode,
        message: preflight.errorMessage,
        type: preflight.errorType,
      });
      const needsReauth = cls.reason === "invalid_token" || cls.reason === "expired_token";
      return structured({
        reason: needsReauth ? cls.reason : (cls.reason === "unknown" ? "invalid_token" : cls.reason),
        message: cls.message || "Threads token preflight failed",
        needsReauth,
      });
    }

    const threadsUserId = preflight.threadsUserId || account.platform_user_id;

    // Single-call repost endpoint
    const repostUrl = new URL(`https://graph.threads.net/v1.0/${threadsUserId}/repost`);
    repostUrl.searchParams.set("access_token", account.access_token);
    repostUrl.searchParams.set("repost_id", repostId);

    const res = await fetch(repostUrl.toString(), { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (data?.error) {
      const cls = classifyMetaError(data.error);
      await logger.error("Threads repost — error", {
        event: "repost_error",
        repost_id: repostId,
        error_code: data.error.code,
        error_message: data.error.message,
      }, userId);
      return structured({
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsPermission: cls.reason === "permission_not_approved" || cls.reason === "missing_scope",
        needsReauth: cls.reason === "invalid_token" || cls.reason === "expired_token",
      });
    }

    const newRepostId = data?.id;

    await logger.info("Threads repost — success", {
      event: "repost_success",
      repost_id: repostId,
      new_repost_id: newRepostId,
    }, userId);

    return ok({ repost_id: newRepostId, original_post_id: repostId });
  } catch (error) {
    const errMsg = (error as Error).message || "Repost failed";
    await logger.error("Threads repost — internal error", {
      event: "internal_error",
      repost_id: repostId,
      error_message: errMsg,
    }, userId);
    return structured({ reason: "unknown", message: errMsg });
  }
});
