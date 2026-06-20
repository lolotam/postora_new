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
const REQUEST_SOURCE = "threads-delete-post";

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
  const logger = createLogger(supabase, "threads-delete-post", "edge");
  let userId: string | undefined;
  let threadsPostId = "";

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
    // Accept either { platform_post_row_id } (UUID of platform_posts row) OR { thread_id, social_account_id }
    const platformPostRowId: string | undefined = body?.platform_post_row_id;
    const directThreadId: string | undefined = body?.thread_id;
    const directAccountId: string | undefined = body?.social_account_id;

    let socialAccountId: string | undefined;

    if (platformPostRowId) {
      const { data: pp, error: ppErr } = await supabase
        .from("platform_posts")
        .select("id, platform, platform_post_id, social_account_id, post_id")
        .eq("id", platformPostRowId)
        .maybeSingle();
      if (ppErr || !pp) {
        return structured({ reason: "not_found", message: "Platform post row not found" });
      }
      if (pp.platform !== "threads") {
        return structured({ reason: "unknown", message: "Row is not a Threads post" });
      }
      // Verify ownership through posts.user_id
      const { data: parent } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", pp.post_id)
        .maybeSingle();
      if (!parent || parent.user_id !== userId) {
        return structured({ reason: "wrong_account", message: "Not owner of this post" });
      }
      threadsPostId = pp.platform_post_id || "";
      socialAccountId = pp.social_account_id || undefined;
    } else if (directThreadId) {
      threadsPostId = String(directThreadId);
      socialAccountId = directAccountId;
    } else {
      return structured({ reason: "unknown", message: "Missing platform_post_row_id or thread_id" });
    }

    if (!threadsPostId) {
      return structured({ reason: "not_found", message: "No Threads post id available" });
    }

    // Get the Threads account token
    let account: SelectedThreadsAccount | null = null;
    if (socialAccountId) {
      const { data: acc } = await supabase
        .from("social_accounts")
        .select("id, user_id, platform_user_id, platform_username, access_token, connected_at, updated_at, token_expires_at")
        .eq("id", socialAccountId)
        .eq("user_id", userId)
        .eq("platform", "threads")
        .maybeSingle();
      if (acc) account = acc as SelectedThreadsAccount;
    }
    if (!account) {
      // fallback: most recent threads account
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
        message: "No Threads account connected to delete with.",
        needsConnection: true,
      });
    }

    await logger.info("Threads delete — selected account", {
      event: "selected_account",
      platform: "threads",
      thread_id: threadsPostId,
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
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsReauth,
      });
    }

    const apiUrl = `https://graph.threads.net/v1.0/${encodeURIComponent(threadsPostId)}?access_token=${encodeURIComponent(account.access_token)}`;
    const res = await fetch(apiUrl, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    await logger.info("Threads delete — live request", {
      event: "live_request",
      platform: "threads",
      endpoint: "DELETE /v1.0/{thread-id}",
      thread_id: threadsPostId,
      meta_status: res.status,
      success: data?.success,
      error_code: data?.error?.code,
      error_message: data?.error?.message,
    }, userId);

    if (data?.error) {
      const cls = classifyMetaError(data.error);
      return structured({
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsPermission: cls.reason === "permission_not_approved" || cls.reason === "missing_scope",
        needsReauth: cls.reason === "invalid_token" || cls.reason === "expired_token",
      });
    }

    // Update capability flag to true (verified working)
    try {
      const meta: any = (account as any).account_metadata || {};
      const caps = meta.capabilities || {};
      if (caps.canDeleteThreadsPosts !== true) {
        await supabase
          .from("social_accounts")
          .update({
            account_metadata: {
              ...meta,
              capabilities: { ...caps, canDeleteThreadsPosts: true },
            },
          })
          .eq("id", account.id);
      }
    } catch { /* best-effort */ }

    return ok({ deleted: true, thread_id: threadsPostId });
  } catch (error) {
    const errMsg = (error as Error).message || "Delete failed";
    await logger.error("Threads delete — internal error", {
      event: "internal_error",
      platform: "threads",
      thread_id: threadsPostId,
      error_message: errMsg,
    }, userId);
    return structured({ reason: "unknown", message: errMsg });
  }
});
