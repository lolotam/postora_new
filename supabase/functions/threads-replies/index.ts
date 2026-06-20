// Threads Reply Center — read-only edge function.
// Actions: get_user_threads, get_thread_replies, get_thread_conversation,
// get_user_replies, get_pending_replies, get_reply_quota.
//
// Endpoint strategy follows Meta's spec: `/me/threads` is token-scoped (listing),
// while replies/quota use `/{threadsUserId}/...`. access_token always goes in the
// query string for GET requests.

import { createLogger } from "../_shared/logging.ts";
import {
  authAndResolveAccount,
  classifyMetaResult,
  corsHeaders,
  jsonErr,
  jsonOk,
  metaGet,
  requireString,
  STANDARD_REPLY_FIELDS,
} from "../_shared/threads-reply-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUEST_SOURCE = "threads-replies";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-replies", "edge");

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const socialAccountId = String(body?.social_account_id || "").trim();

    if (!action) return jsonErr({ reason: "bad_request", message: "Missing required field: action" }, REQUEST_SOURCE);
    if (!socialAccountId) return jsonErr({ reason: "bad_request", message: "Missing required field: social_account_id" }, REQUEST_SOURCE);

    const resolved = await authAndResolveAccount(req, socialAccountId, REQUEST_SOURCE);
    if ("earlyResponse" in resolved) return resolved.earlyResponse;
    const { threadsUserId, accessToken, userId } = resolved.account;

    switch (action) {
      case "get_user_threads": {
        const limit = Math.max(1, Math.min(25, Number(body?.limit) || 10));
        const after = typeof body?.after === "string" && body.after.trim() ? body.after : undefined;
        // /me/threads — token-scoped per Meta spec
        const r = await metaGet("/me/threads", accessToken, {
          fields: "id,text,timestamp,permalink,media_type",
          limit,
          after,
        });
        if (!r.ok || r.data?.error) {
          const c = classifyMetaResult(r);
          await logger.error("get_user_threads error", { event: "get_user_threads_error", reason: c.reason, message: c.message }, userId);
          return jsonErr(c, REQUEST_SOURCE);
        }
        return jsonOk({ data: r.data?.data || [], paging: r.data?.paging || null }, REQUEST_SOURCE);
      }

      case "get_thread_replies": {
        const m = requireString(body?.media_id, "media_id");
        if (!m.ok) return jsonErr({ reason: "bad_request", message: m.message }, REQUEST_SOURCE);
        const reverse = body?.reverse === true;
        const r = await metaGet(`/${encodeURIComponent(m.value)}/replies`, accessToken, {
          fields: STANDARD_REPLY_FIELDS,
          reverse: reverse ? "true" : undefined,
        });
        if (!r.ok || r.data?.error) return jsonErr(classifyMetaResult(r), REQUEST_SOURCE);
        return jsonOk({ data: r.data?.data || [], paging: r.data?.paging || null }, REQUEST_SOURCE);
      }

      case "get_thread_conversation": {
        const m = requireString(body?.media_id, "media_id");
        if (!m.ok) return jsonErr({ reason: "bad_request", message: m.message }, REQUEST_SOURCE);
        const reverse = body?.reverse === true;
        const r = await metaGet(`/${encodeURIComponent(m.value)}/conversation`, accessToken, {
          fields: STANDARD_REPLY_FIELDS,
          reverse: reverse ? "true" : undefined,
        });
        if (!r.ok || r.data?.error) return jsonErr(classifyMetaResult(r), REQUEST_SOURCE);
        return jsonOk({ data: r.data?.data || [], paging: r.data?.paging || null }, REQUEST_SOURCE);
      }

      case "get_user_replies": {
        const limit = Math.max(1, Math.min(50, Number(body?.limit) || 25));
        const since = typeof body?.since === "string" ? body.since : undefined;
        const until = typeof body?.until === "string" ? body.until : undefined;
        const r = await metaGet(`/${encodeURIComponent(threadsUserId)}/replies`, accessToken, {
          fields: STANDARD_REPLY_FIELDS,
          limit,
          since,
          until,
        });
        if (!r.ok || r.data?.error) return jsonErr(classifyMetaResult(r), REQUEST_SOURCE);
        return jsonOk({ data: r.data?.data || [], paging: r.data?.paging || null }, REQUEST_SOURCE);
      }

      case "get_pending_replies": {
        const limit = Math.max(1, Math.min(50, Number(body?.limit) || 50));
        const r = await metaGet(`/${encodeURIComponent(threadsUserId)}/replies`, accessToken, {
          fields: STANDARD_REPLY_FIELDS,
          limit,
        });
        if (!r.ok || r.data?.error) return jsonErr(classifyMetaResult(r), REQUEST_SOURCE);
        const all = Array.isArray(r.data?.data) ? r.data.data : [];
        const pending = all.filter((x: any) => String(x?.hide_status || "").toUpperCase() === "PENDING");
        return jsonOk({ data: pending, paging: r.data?.paging || null }, REQUEST_SOURCE);
      }

      case "get_reply_quota": {
        const r = await metaGet(`/${encodeURIComponent(threadsUserId)}/threads_publishing_limit`, accessToken, {
          fields: "reply_quota_usage,reply_config",
        });
        if (!r.ok || r.data?.error) return jsonErr(classifyMetaResult(r), REQUEST_SOURCE);
        const first = Array.isArray(r.data?.data) ? r.data.data[0] : r.data;
        return jsonOk({ quota: first || null }, REQUEST_SOURCE);
      }

      case "get_post": {
        const m = requireString(body?.media_id, "media_id");
        if (!m.ok) return jsonErr({ reason: "bad_request", message: m.message }, REQUEST_SOURCE);
        const r = await metaGet(`/${encodeURIComponent(m.value)}`, accessToken, {
          fields: STANDARD_REPLY_FIELDS,
        });
        if (!r.ok || r.data?.error) return jsonErr(classifyMetaResult(r), REQUEST_SOURCE);
        return jsonOk({ data: r.data || null }, REQUEST_SOURCE);
      }

      default:
        return jsonErr({ reason: "bad_request", message: `Unknown action: ${action}` }, REQUEST_SOURCE);
    }
  } catch (error) {
    await logger.error("threads-replies internal error", { event: "internal_error", error_message: (error as Error).message });
    return jsonErr({ reason: "unknown", message: (error as Error).message || "Internal error" }, REQUEST_SOURCE);
  }
});