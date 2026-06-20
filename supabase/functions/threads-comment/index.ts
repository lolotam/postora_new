// Posts a reply to any public Threads post.
// Uses the same two-step container/publish pattern as `process-post`'s threads handler,
// with `reply_to_id` set to the target thread.
// Mirrors `threads-delete-post` in auth, account selection, logging, and response shape.
// v1.0.1 — force redeploy (function was missing on server)

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
const REQUEST_SOURCE = "threads-comment";
const THREADS_CHAR_LIMIT = 500;

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

function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= THREADS_CHAR_LIMIT) return { text, truncated: false };
  const cut = text.substring(0, THREADS_CHAR_LIMIT - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const out = (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + "…";
  return { text: out, truncated: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-comment", "edge");
  let userId: string | undefined;
  let threadId = "";

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
    threadId = String(body?.thread_id || "").trim();
    const rawText = String(body?.text || "").trim();
    const directAccountId: string | undefined = body?.social_account_id;

    if (!threadId) return structured({ reason: "unknown", message: "Missing thread_id" });
    if (!rawText) return structured({ reason: "unknown", message: "Comment text is required" });

    const { text: commentText, truncated } = truncate(rawText);

    // Pick the Threads account
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
        message: "No Threads account connected to comment with.",
        needsConnection: true,
      });
    }

    await logger.info("Threads comment — selected account", {
      event: "selected_account",
      platform: "threads",
      thread_id: threadId,
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

    const threadsUserId = preflight.threadsUserId || account.platform_user_id;
    const containerEndpoint = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    const publishEndpoint = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;

    // 1. Create container
    const containerUrl = new URL(containerEndpoint);
    containerUrl.searchParams.set("access_token", account.access_token);
    containerUrl.searchParams.set("media_type", "TEXT");
    containerUrl.searchParams.set("text", commentText);
    containerUrl.searchParams.set("reply_to_id", threadId);

    const containerRes = await fetch(containerUrl.toString(), { method: "POST" });
    const containerData = await containerRes.json().catch(() => ({}));

    if (containerData?.error) {
      const cls = classifyMetaError(containerData.error);
      await logger.error("Threads comment — container error", {
        event: "container_error",
        thread_id: threadId,
        error_code: containerData.error.code,
        error_message: containerData.error.message,
      }, userId);
      return structured({
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
        needsPermission: cls.reason === "permission_not_approved" || cls.reason === "missing_scope",
        needsReauth: cls.reason === "invalid_token" || cls.reason === "expired_token",
      });
    }

    const containerId = containerData?.id;
    if (!containerId) {
      return structured({ reason: "unknown", message: "No container id returned" });
    }

    // 2. Poll status
    const statusEndpoint = `https://graph.threads.net/v1.0/${containerId}?fields=status&access_token=${encodeURIComponent(account.access_token)}`;
    const maxAttempts = 8;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const sr = await fetch(statusEndpoint);
        const sd = await sr.json().catch(() => ({}));
        const status = sd?.status;
        if (status === "FINISHED") break;
        if (status === "ERROR") {
          return structured({ reason: "unknown", message: "Threads container processing failed" });
        }
      } catch { /* keep polling */ }
    }

    // 3. Publish
    const publishUrl = new URL(publishEndpoint);
    publishUrl.searchParams.set("access_token", account.access_token);
    publishUrl.searchParams.set("creation_id", containerId);

    const publishRes = await fetch(publishUrl.toString(), { method: "POST" });
    const publishData = await publishRes.json().catch(() => ({}));

    if (publishData?.error) {
      const cls = classifyMetaError(publishData.error);
      await logger.error("Threads comment — publish error", {
        event: "publish_error",
        thread_id: threadId,
        error_code: publishData.error.code,
        error_message: publishData.error.message,
      }, userId);
      return structured({
        reason: cls.reason,
        message: cls.message,
        meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
      });
    }

    const commentId = publishData?.id;

    // Best-effort permalink fetch
    let permalink: string | undefined;
    try {
      const verifyRes = await fetch(
        `https://graph.threads.net/v1.0/${commentId}?fields=permalink&access_token=${encodeURIComponent(account.access_token)}`,
      );
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyData?.permalink) {
        permalink = String(verifyData.permalink).replace("https://www.threads.net/", "https://www.threads.com/");
      }
    } catch { /* ignore */ }

    await logger.info("Threads comment — success", {
      event: "comment_success",
      thread_id: threadId,
      comment_id: commentId,
      truncated,
    }, userId);

    return ok({ comment_id: commentId, permalink, truncated });
  } catch (error) {
    const errMsg = (error as Error).message || "Comment failed";
    await logger.error("Threads comment — internal error", {
      event: "internal_error",
      thread_id: threadId,
      error_message: errMsg,
    }, userId);
    return structured({ reason: "unknown", message: errMsg });
  }
});
