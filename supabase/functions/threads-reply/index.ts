// Threads Reply Center — create reply edge function.
// Action: create_reply.
//
// Strict 3-step flow with NO polling (text replies only):
//   1. POST /{threadsUserId}/threads (container) — token in body
//   2. POST /{threadsUserId}/threads_publish (publish) — single 2s retry on transient errors
//   3. GET /{reply_id}?fields=permalink — best-effort, never fails the reply

import { createLogger } from "../_shared/logging.ts";
import {
  authAndResolveAccount,
  classifyMetaResult,
  corsHeaders,
  isPermanentMetaError,
  jsonErr,
  jsonOk,
  metaGet,
  metaPost,
  requireString,
} from "../_shared/threads-reply-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUEST_SOURCE = "threads-reply";
const THREADS_CHAR_LIMIT = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logger = createLogger(supabase, "threads-reply", "edge");

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "create_reply").trim();
    const socialAccountId = String(body?.social_account_id || "").trim();

    if (action !== "create_reply") {
      return jsonErr({ reason: "bad_request", message: `Unknown action: ${action}` }, REQUEST_SOURCE);
    }
    if (!socialAccountId) {
      return jsonErr({ reason: "bad_request", message: "Missing required field: social_account_id" }, REQUEST_SOURCE);
    }

    const replyTo = requireString(body?.reply_to_id, "reply_to_id");
    if (!replyTo.ok) return jsonErr({ reason: "bad_request", message: replyTo.message }, REQUEST_SOURCE);

    // Optional media attachment
    const rawMediaType = String(body?.media_type || "TEXT").trim().toUpperCase();
    if (!["TEXT", "IMAGE", "VIDEO"].includes(rawMediaType)) {
      return jsonErr({ reason: "bad_request", message: `Invalid media_type: ${rawMediaType}` }, REQUEST_SOURCE);
    }
    const mediaType = rawMediaType as "TEXT" | "IMAGE" | "VIDEO";
    const mediaUrl = String(body?.media_url || "").trim();
    if (mediaType !== "TEXT") {
      if (!mediaUrl) {
        return jsonErr({ reason: "bad_request", message: "media_url is required when media_type is IMAGE or VIDEO" }, REQUEST_SOURCE);
      }
      if (!/^https:\/\//i.test(mediaUrl)) {
        return jsonErr({ reason: "bad_request", message: "media_url must be a public HTTPS URL" }, REQUEST_SOURCE);
      }
    }

    // Text guard + truncation safety. Text becomes optional when media is attached.
    const cleanText = String(body?.text || "").trim();
    if (!cleanText && mediaType === "TEXT") {
      return jsonErr({ reason: "bad_request", message: "Reply text is required" }, REQUEST_SOURCE);
    }
    const truncatedText = cleanText.slice(0, THREADS_CHAR_LIMIT);
    const truncated = cleanText.length > THREADS_CHAR_LIMIT;

    // Topic Tag (optional, Threads-only) — sanitize: strip "." and "&", max 50.
    const rawTopicTagInput = String(body?.topic_tag ?? "").trim();
    let cleanedTopicTag: string | null = null;
    if (rawTopicTagInput) {
      const c = rawTopicTagInput.replace(/[.&]/g, "").slice(0, 50).trim();
      if (c.length >= 1) cleanedTopicTag = c;
    }
    const topicTagDebug: Record<string, unknown> = {
      raw: rawTopicTagInput || null,
      cleaned: cleanedTopicTag,
      sent: false,
      accepted: false,
      returned_by_meta: null as string | null,
    };

    const resolved = await authAndResolveAccount(req, socialAccountId, REQUEST_SOURCE);
    if ("earlyResponse" in resolved) return resolved.earlyResponse;
    const { threadsUserId, accessToken, userId } = resolved.account;

    // 1. Create container
    const containerParams: Record<string, string> = {
      media_type: mediaType,
      reply_to_id: replyTo.value,
    };
    if (truncatedText) containerParams.text = truncatedText;
    if (mediaType === "IMAGE") containerParams.image_url = mediaUrl;
    if (mediaType === "VIDEO") containerParams.video_url = mediaUrl;
    if (cleanedTopicTag) {
      containerParams.topic_tag = cleanedTopicTag;
      topicTagDebug.sent = true;
    }
    const containerTimeoutMs =
      mediaType === "VIDEO" ? 120_000 : mediaType === "IMAGE" ? 60_000 : 10_000;
    const c = await metaPost(
      `/${encodeURIComponent(threadsUserId)}/threads`,
      accessToken,
      containerParams,
      containerTimeoutMs,
    );
    if (!c.ok || c.data?.error) {
      const cls = classifyMetaResult(c);
      await logger.error("create_reply container error", { event: "container_error", reason: cls.reason, message: cls.message }, userId);
      return jsonErr(cls, REQUEST_SOURCE);
    }
    const creationId = c.data?.id;
    if (!creationId) {
      return jsonErr({ reason: "unknown", message: "Threads did not return a container id" }, REQUEST_SOURCE);
    }
    // Container creation succeeded — Meta accepted the topic_tag param if we sent one.
    if (topicTagDebug.sent) topicTagDebug.accepted = true;

    // 2a. For media replies, poll the container until FINISHED before publishing.
    let mediaPollAttempts = 0;
    let mediaFinalStatus: string | null = null;
    if (mediaType !== "TEXT") {
      const maxAttempts = mediaType === "VIDEO" ? 60 : 30; // ~3 min / ~90 s at 3 s interval
      const delayMs = 3000;
      for (let i = 0; i < maxAttempts; i++) {
        mediaPollAttempts = i + 1;
        const s = await metaGet(`/${encodeURIComponent(String(creationId))}`, accessToken, {
          fields: "status,error_message",
        });
        if (s.ok && s.data && !s.data.error) {
          const status = String(s.data.status || "").toUpperCase();
          mediaFinalStatus = status;
          if (status === "FINISHED") break;
          if (status === "ERROR" || status === "EXPIRED") {
            await logger.error("create_reply media processing failed", {
              event: "media_processing_failed",
              status,
              error_message: s.data.error_message ?? null,
              attempts: mediaPollAttempts,
            }, userId);
            return jsonErr(
              {
                reason: "media_processing_failed",
                message: s.data.error_message || `Media container ${status}`,
              },
              REQUEST_SOURCE,
            );
          }
        }
        await new Promise((r) => setTimeout(r, delayMs));
      }
      if (mediaFinalStatus !== "FINISHED") {
        await logger.error("create_reply media processing timeout", {
          event: "media_processing_timeout",
          last_status: mediaFinalStatus,
          attempts: mediaPollAttempts,
        }, userId);
        return jsonErr(
          {
            reason: "media_processing_timeout",
            message: "Threads took too long to process your media. Please try again.",
          },
          REQUEST_SOURCE,
        );
      }
    }

    // 2b. Publish — single retry after 2s for transient errors only
    async function pub() {
      return metaPost(`/${encodeURIComponent(threadsUserId)}/threads_publish`, accessToken, {
        creation_id: String(creationId),
      });
    }
    let p = await pub();
    if (p.ok && p.data?.error && !isPermanentMetaError(p.data.error)) {
      await new Promise((r) => setTimeout(r, 2000));
      p = await pub();
    } else if (!p.ok) {
      // Transient failure (network_error / invalid_response / non-permanent http_error) — retry once.
      const errPayload = (p as any).data?.error;
      const isPermanentHttp = p.reason === "http_error" && isPermanentMetaError(errPayload);
      if (!isPermanentHttp) {
        await new Promise((r) => setTimeout(r, 2000));
        p = await pub();
      }
    }
    if (!p.ok || p.data?.error) {
      const cls = classifyMetaResult(p);
      await logger.error("create_reply publish error", { event: "publish_error", reason: cls.reason, message: cls.message }, userId);
      return jsonErr(cls, REQUEST_SOURCE);
    }
    const replyId: string | undefined = p.data?.id;
    if (!replyId) {
      return jsonErr({ reason: "unknown", message: "Threads did not return a reply id" }, REQUEST_SOURCE);
    }

    // 3. Permalink + topic_tag verify — best-effort. Failure MUST NOT fail the reply.
    let permalink: string | null = null;
    const pm = await metaGet(`/${encodeURIComponent(replyId)}`, accessToken, { fields: "permalink,topic_tag" });
    if (pm.ok && pm.data) {
      if (pm.data.permalink) {
        permalink = String(pm.data.permalink).replace("https://www.threads.net/", "https://www.threads.com/");
      }
      if ("topic_tag" in pm.data) {
        const v = (pm.data as Record<string, unknown>).topic_tag;
        topicTagDebug.returned_by_meta = v == null ? null : String(v);
      }
    }

    await logger.info("create_reply success", {
      event: "create_reply_success",
      reply_id: replyId,
      reply_to_id: replyTo.value,
      truncated,
      media_type: mediaType,
      has_media: mediaType !== "TEXT",
      media_poll_attempts: mediaPollAttempts,
      media_final_status: mediaFinalStatus,
      has_permalink: !!permalink,
      topic_tag_sent: topicTagDebug.sent,
      topic_tag_accepted: topicTagDebug.accepted,
    }, userId);

    return jsonOk(
      {
        reply_id: replyId,
        permalink,
        truncated,
        ...(rawTopicTagInput ? { topic_tag_debug: topicTagDebug } : {}),
      },
      REQUEST_SOURCE,
    );
  } catch (error) {
    return jsonErr({ reason: "unknown", message: (error as Error).message || "Internal error" }, REQUEST_SOURCE);
  }
});