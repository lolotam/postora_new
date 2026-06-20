// Threads Reply Center — manage edge function.
// Actions: hide_reply, unhide_reply, approve_pending_reply, reject_pending_reply,
// control_reply_audience.
//
// All POST requests pass access_token in the URLSearchParams body via metaPost.

import { createLogger } from "../_shared/logging.ts";
import {
  authAndResolveAccount,
  classifyMetaResult,
  corsHeaders,
  jsonErr,
  jsonOk,
  metaPost,
  requireString,
} from "../_shared/threads-reply-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUEST_SOURCE = "threads-manage-reply";

function manageReplyResultToReason(r: any): { reason: string; message: string } {
  const c = classifyMetaResult(r);
  // Map generic Meta 400 on manage_reply to a more specific reason
  if (c.reason === "unknown" && c.meta?.code && c.meta.code >= 400) {
    return { reason: "reply_not_manageable", message: c.message };
  }
  return c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-manage-reply", "edge");

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const socialAccountId = String(body?.social_account_id || "").trim();

    if (!action) return jsonErr({ reason: "bad_request", message: "Missing required field: action" }, REQUEST_SOURCE);
    if (!socialAccountId) return jsonErr({ reason: "bad_request", message: "Missing required field: social_account_id" }, REQUEST_SOURCE);

    const resolved = await authAndResolveAccount(req, socialAccountId, REQUEST_SOURCE);
    if ("earlyResponse" in resolved) return resolved.earlyResponse;
    const { accessToken, userId } = resolved.account;

    switch (action) {
      case "hide_reply":
      case "unhide_reply":
      case "approve_pending_reply":
      case "reject_pending_reply": {
        const rid = requireString(body?.reply_id, "reply_id");
        if (!rid.ok) return jsonErr({ reason: "bad_request", message: rid.message }, REQUEST_SOURCE);
        const hide =
          action === "hide_reply" || action === "reject_pending_reply" ? "true" : "false";
        const r = await metaPost(`/${encodeURIComponent(rid.value)}/manage_reply`, accessToken, { hide });
        if (!r.ok || r.data?.error) {
          const c = manageReplyResultToReason(r);
          await logger.error("manage_reply error", { event: "manage_reply_error", action, reply_id: rid.value, reason: c.reason, message: c.message }, userId);
          return jsonErr(c, REQUEST_SOURCE);
        }
        return jsonOk({ reply_id: rid.value, hide: hide === "true" }, REQUEST_SOURCE);
      }

      case "control_reply_audience": {
        const m = requireString(body?.media_id, "media_id");
        if (!m.ok) return jsonErr({ reason: "bad_request", message: m.message }, REQUEST_SOURCE);
        const audience = requireString(body?.audience, "audience");
        if (!audience.ok) return jsonErr({ reason: "bad_request", message: audience.message }, REQUEST_SOURCE);
        try {
          const r = await metaPost(`/${encodeURIComponent(m.value)}`, accessToken, {
            reply_control: audience.value,
          });
          if (!r.ok || r.data?.error) {
            // Best-effort feature; treat any failure as unsupported
            return jsonErr({ reason: "unsupported_feature", message: "Reply audience control is not supported for this account" }, REQUEST_SOURCE);
          }
          return jsonOk({ media_id: m.value, audience: audience.value }, REQUEST_SOURCE);
        } catch {
          return jsonErr({ reason: "unsupported_feature", message: "Reply audience control is not supported for this account" }, REQUEST_SOURCE);
        }
      }

      default:
        return jsonErr({ reason: "bad_request", message: `Unknown action: ${action}` }, REQUEST_SOURCE);
    }
  } catch (error) {
    await logger.error("threads-manage-reply internal error", { event: "internal_error", error_message: (error as Error).message });
    return jsonErr({ reason: "unknown", message: (error as Error).message || "Internal error" }, REQUEST_SOURCE);
  }
});