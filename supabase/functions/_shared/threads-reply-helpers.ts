// Shared HTTP helpers and error mapping for the Threads Reply Center edge functions.
// All Meta Threads API calls MUST go through `metaGet` (token in query) or
// `metaPost` (token in body) — never both — to avoid auth inconsistencies.

import { classifyMetaError } from "./threads-debug.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface ResolvedThreadsAccount {
  userId: string;
  socialAccountId: string;
  threadsUserId: string;
  accessToken: string;
  username: string;
}

/**
 * Validates the request JWT, then loads the selected social_accounts row scoped to the
 * authenticated user. Returns either the resolved account (server-derived threadsUserId
 * and accessToken) or a Response that the caller should return immediately.
 */
export async function authAndResolveAccount(
  req: Request,
  socialAccountId: string,
  requestSource: string,
): Promise<{ account: ResolvedThreadsAccount } | { earlyResponse: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { earlyResponse: jsonErr({ reason: "unauthorized", message: "Missing authorization header" }, requestSource) };
  }
  const token = authHeader.replace("Bearer ", "");
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return { earlyResponse: jsonErr({ reason: "unauthorized", message: "Unauthorized" }, requestSource) };
  }
  const userId = claimsData.claims.sub as string;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: row, error } = await supabase
    .from("social_accounts")
    .select("id, user_id, platform_user_id, platform_username, access_token")
    .eq("id", socialAccountId)
    .eq("user_id", userId)
    .eq("platform", "threads")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !row) {
    return { earlyResponse: jsonErr({ reason: "no_account", message: "Threads account not found" }, requestSource) };
  }
  if (!row.access_token || !row.platform_user_id) {
    return { earlyResponse: jsonErr({ reason: "no_account", message: "Threads account is missing token or user id" }, requestSource) };
  }

  return {
    account: {
      userId,
      socialAccountId: row.id,
      threadsUserId: String(row.platform_user_id),
      accessToken: row.access_token,
      username: row.platform_username || "",
    },
  };
}

/** Validate that a string field is present and non-empty. */
export function requireString(value: unknown, name: string): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, message: `Missing required field: ${name}` };
  }
  return { ok: true, value: value.trim() };
}

const META_BASE = "https://graph.threads.net/v1.0";
const META_TIMEOUT_MS = 10_000;

export const STANDARD_REPLY_FIELDS = [
  "id",
  "text",
  "username",
  "permalink",
  "timestamp",
  "media_type",
  "media_url",
  "thumbnail_url",
  "has_replies",
  "is_reply",
  "is_reply_owned_by_me",
  "reply_audience",
  "hide_status",
  "root_post",
  "replied_to",
].join(",");

export type MetaFetchResult =
  | { ok: true; status: number; data: any }
  | { ok: false; reason: "http_error"; status: number; data: any }
  | { ok: false; reason: "invalid_response"; status?: number }
  | { ok: false; reason: "network_error"; message: string };

async function metaFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = META_TIMEOUT_MS,
): Promise<MetaFetchResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    let data: any;
    try {
      data = await res.json();
    } catch {
      return { ok: false, reason: "invalid_response", status: res.status };
    }
    if (!res.ok) {
      return { ok: false, reason: "http_error", status: res.status, data };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, reason: "network_error", message: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

/** GET helper — token always in the query string. */
export function metaGet(
  path: string,
  accessToken: string,
  query: Record<string, string | number | boolean | undefined> = {},
  timeoutMs?: number,
): Promise<MetaFetchResult> {
  const u = new URL(`${META_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  }
  u.searchParams.set("access_token", accessToken);
  return metaFetch(u.toString(), { method: "GET" }, timeoutMs);
}

/** POST helper — token always in the URLSearchParams body. */
export function metaPost(
  path: string,
  accessToken: string,
  body: Record<string, string> = {},
  timeoutMs?: number,
): Promise<MetaFetchResult> {
  const params = new URLSearchParams(body);
  params.set("access_token", accessToken);
  return metaFetch(`${META_BASE}${path}`, { method: "POST", body: params }, timeoutMs);
}

/** Map a Meta `error` payload into our reason vocabulary. Shared by HTTP-200-with-error
 *  and HTTP-error-with-payload paths. */
function classifyMetaErrorPayload(err: any): {
  reason: string;
  message: string;
  meta?: { code?: number; subcode?: number; type?: string };
} {
  const cls = classifyMetaError(err);
  const lower = String(err?.message || "").toLowerCase();
  if (err?.code === 100) {
    return {
      reason: "invalid_media_id",
      message: cls.message,
      meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
    };
  }
  if (cls.reason === "rate_limited") {
    return {
      reason: "rate_limited",
      message: cls.message,
      meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
    };
  }
  let reason: string = cls.reason;
  if (reason === "missing_scope" || lower.includes("permission")) reason = "missing_scope";
  return {
    reason,
    message: cls.message,
    meta: { code: cls.code, subcode: cls.subcode, type: cls.type },
  };
}

/** Normalize a metaFetch result into our reason vocabulary. */
export function classifyMetaResult(r: MetaFetchResult): {
  reason: string;
  message: string;
  meta?: { code?: number; subcode?: number; type?: string };
} {
  if (!r.ok) {
    if (r.reason === "http_error") {
      const err = (r as any).data?.error;
      if (err) return classifyMetaErrorPayload(err);
      return {
        reason: "http_error",
        message: `Threads returned HTTP ${(r as any).status}`,
      };
    }
    return {
      reason: r.reason,
      message: r.reason === "network_error" ? (r as any).message : "Invalid response from Threads",
    };
  }
  const err = r.data?.error;
  if (!err) return { reason: "unknown", message: "Unknown error" };
  return classifyMetaErrorPayload(err);
}

/** Returns true if the error is a permanent failure that must NOT be retried. */
export function isPermanentMetaError(err: any): boolean {
  if (!err) return false;
  if ([190, 10, 100].includes(err.code)) return true;
  if (String(err.message || "").toLowerCase().includes("permission")) return true;
  return false;
}

/** Standard JSON responses. */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export { corsHeaders };

export function jsonOk(body: Record<string, unknown>, requestSource: string): Response {
  return new Response(JSON.stringify({ ok: true, requestSource, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonErr(body: { reason: string; message: string; [k: string]: unknown }, requestSource: string): Response {
  return new Response(JSON.stringify({ ok: false, requestSource, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}