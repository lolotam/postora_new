// Shared helpers for Threads edge functions: account selection, token preflight, error classification.
// All log payloads are safe (no full tokens — only length / first-6 / last-4 prefix-suffix).

export interface SelectedThreadsAccount {
  id: string;
  user_id: string;
  platform_user_id: string;
  platform_username: string;
  access_token: string;
  connected_at: string | null;
  updated_at: string | null;
  token_expires_at: string | null;
}

export interface AccountLogSummary {
  social_account_id: string;
  platform_user_id: string;
  platform_username: string;
  token_len: number;
  token_prefix: string;
  token_suffix: string;
  connected_at: string | null;
  expires_at: string | null;
}

export function summarizeAccount(acc: SelectedThreadsAccount): AccountLogSummary {
  const t = acc.access_token || "";
  return {
    social_account_id: acc.id,
    platform_user_id: acc.platform_user_id,
    platform_username: acc.platform_username,
    token_len: t.length,
    token_prefix: t.slice(0, 6),
    token_suffix: t.slice(-4),
    connected_at: acc.connected_at,
    expires_at: acc.token_expires_at,
  };
}

/**
 * Pick the most recently connected active Threads account for a user.
 * Prefers `connected_at DESC` then `updated_at DESC` so a fresh reconnect always wins.
 */
export async function getThreadsAccount(
  supabase: any,
  userId: string,
): Promise<SelectedThreadsAccount | null> {
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, user_id, platform_user_id, platform_username, access_token, connected_at, updated_at, token_expires_at")
    .eq("user_id", userId)
    .eq("platform", "threads")
    .eq("is_active", true)
    .order("connected_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0] as SelectedThreadsAccount;
}

export interface PreflightResult {
  ok: boolean;
  threadsUserId?: string;
  threadsUsername?: string;
  errorCode?: number;
  errorSubcode?: number;
  errorMessage?: string;
  errorType?: string;
  rawStatus?: number;
}

/**
 * Preflight `GET /v1.0/me?fields=id,username` — the canonical "who am I" call for Threads tokens.
 * Note: Meta's /debug_token endpoint does NOT apply to Threads tokens (Threads is a separate OAuth domain).
 */
export async function debugThreadsToken(accessToken: string): Promise<PreflightResult> {
  try {
    const res = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );
    const j = await res.json().catch(() => ({}));
    if (j?.error) {
      return {
        ok: false,
        rawStatus: res.status,
        errorCode: j.error.code,
        errorSubcode: j.error.error_subcode,
        errorMessage: j.error.message || j.error.error_user_msg || "Token preflight failed",
        errorType: j.error.type,
      };
    }
    if (!j?.id) {
      return { ok: false, rawStatus: res.status, errorMessage: "Preflight returned no id" };
    }
    return { ok: true, threadsUserId: String(j.id), threadsUsername: j.username || "" };
  } catch (e) {
    return { ok: false, errorMessage: (e as Error).message };
  }
}

export interface OwnThreadsResult {
  ok: boolean;
  status: number;
  data?: any[];
  error?: any;
}

/**
 * Fetch the authenticated user's own Threads posts via `GET /v1.0/{userId}/threads`.
 * This is the official "List a User's Threads" endpoint and only requires `threads_basic`,
 * NOT the `threads_profile_discovery` scope.
 */
export async function fetchOwnThreads(
  accessToken: string,
  threadsUserId: string,
  limit = 25,
): Promise<OwnThreadsResult> {
  const fields = [
    "id",
    "media_product_type",
    "media_type",
    "media_url",
    "permalink",
    "owner",
    "username",
    "text",
    "timestamp",
    "shortcode",
    "thumbnail_url",
    "children",
    "is_quote_post",
  ].join(",");

  const url = `https://graph.threads.net/v1.0/${encodeURIComponent(threadsUserId)}/threads?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`;
  try {
    const res = await fetch(url);
    const j = await res.json().catch(() => ({}));
    if (j?.error) return { ok: false, status: res.status, error: j.error };
    return { ok: true, status: res.status, data: Array.isArray(j?.data) ? j.data : [] };
  } catch (e) {
    return { ok: false, status: 0, error: { message: (e as Error).message } };
  }
}

/**
 * Probe outcome for a single capability check.
 * - capability=true  → Meta accepted the request, scope is granted and working.
 * - capability=false → Meta explicitly rejected with a permission/scope error (verified missing).
 * - capability=null  → Could not verify (transient error, network, unrelated failure).
 */
export interface ProbeOutcome {
  ok: boolean;
  capability: boolean | null;
  code?: number;
  subcode?: number;
  message?: string;
}

export function classifyProbeResponse(j: any): ProbeOutcome {
  if (!j?.error) return { ok: true, capability: true };
  const code: number | undefined = j.error.code;
  const subcode: number | undefined = j.error.error_subcode;
  const message: string = (j.error.message || j.error.error_user_msg || "").toString();
  const lower = message.toLowerCase();
  if (
    code === 10 &&
    (lower.includes("permission") ||
      lower.includes("scope") ||
      lower.includes("approved") ||
      lower.includes("unapproved") ||
      lower.includes("review"))
  ) {
    return { ok: false, capability: false, code, subcode, message };
  }
  return { ok: false, capability: null, code, subcode, message };
}

/** Probe `threads_keyword_search` with a tiny query. */
export async function probeKeywordSearch(token: string, sampleQuery = "test"): Promise<ProbeOutcome> {
  try {
    const r = await fetch(
      `https://graph.threads.net/v1.0/keyword_search?q=${encodeURIComponent(sampleQuery)}&fields=id&limit=1&access_token=${encodeURIComponent(token)}`,
    );
    return classifyProbeResponse(await r.json());
  } catch (e) {
    return { ok: false, capability: null, message: (e as Error).message };
  }
}

/** Probe `threads_location_tagging` via /location_search. */
export async function probeLocationSearch(token: string, sampleQuery = "coffee"): Promise<ProbeOutcome> {
  try {
    const r = await fetch(
      `https://graph.threads.net/v1.0/location_search?q=${encodeURIComponent(sampleQuery)}&fields=id&access_token=${encodeURIComponent(token)}`,
    );
    return classifyProbeResponse(await r.json());
  } catch (e) {
    return { ok: false, capability: null, message: (e as Error).message };
  }
}

/**
 * Detect whether Threads `/location_search` returned Meta's sandbox sample dataset.
 *
 * Meta serves a fixed Menlo Park dataset to apps that have the OAuth scope granted but
 * do NOT yet have Advanced Access for `threads_location_tagging`. The same payload is
 * returned regardless of the query, so we fingerprint the rows to detect this case.
 *
 * Heuristic:
 *  - If the query has a meaningful token (length >= 3) AND none of the result rows
 *    contain that token AND a majority of rows match the Menlo Park fingerprint,
 *    we treat it as sample data.
 *  - For probe queries (e.g. "coffee", "test") we still flag sample data when the
 *    Menlo Park fingerprint dominates, because real Meta data wouldn't return only
 *    Menlo Park rows for a generic query like "coffee".
 */
export function isThreadsLocationSampleData(rows: any[], query?: string): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  const fingerprintHit = (p: any): boolean => {
    const name = String(p?.name || "").toLowerCase();
    const city = String(p?.city || "").toLowerCase();
    const country = String(p?.country || "").toLowerCase();
    if (name.includes("menlo park") || city.includes("menlo park")) return true;
    if ((country === "us" || country === "united states") && city.includes("menlo park")) return true;
    return false;
  };

  const hits = rows.filter(fingerprintHit).length;
  const fingerprintRatio = hits / rows.length;

  const q = (query || "").trim().toLowerCase();
  const hasMeaningfulQuery = q.length >= 3 && !["test", "coffee", "place"].includes(q);

  if (hasMeaningfulQuery) {
    const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
    const queryMatchesAny = rows.some((p) => {
      const haystack = [p?.name, p?.city, p?.country, p?.address]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return tokens.some((t) => haystack.includes(t));
    });
    if (!queryMatchesAny && fingerprintRatio > 0.5) return true;
  }

  // Probe / generic queries: dominant Menlo Park fingerprint is itself the signal.
  if (fingerprintRatio >= 0.6) return true;

  return false;
}

/**
 * Filter Threads `/location_search` rows down to those that contain at least one
 * meaningful query token. Returns the original rows if the query has no token >= 3.
 */
export function filterRelevantThreadsLocations(rows: any[], query: string): any[] {
  const q = (query || "").trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return rows;
  return rows.filter((p) => {
    const haystack = [p?.name, p?.city, p?.country, p?.address]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    return tokens.some((t) => haystack.includes(t));
  });
}

/** Probe `threads_manage_insights`. */
export async function probeInsights(token: string, threadsUserId: string): Promise<ProbeOutcome> {
  try {
    const r = await fetch(
      `https://graph.threads.net/v1.0/${encodeURIComponent(threadsUserId)}/threads_insights?metric=views&access_token=${encodeURIComponent(token)}`,
    );
    return classifyProbeResponse(await r.json());
  } catch (e) {
    return { ok: false, capability: null, message: (e as Error).message };
  }
}

/** Probe `threads_profile_discovery` with the user's own username. */
export async function probeDiscovery(token: string, username: string): Promise<ProbeOutcome> {
  try {
    const r = await fetch(
      `https://graph.threads.net/v1.0/profile_posts?username=${encodeURIComponent(username)}&fields=id&limit=1&access_token=${encodeURIComponent(token)}`,
    );
    return classifyProbeResponse(await r.json());
  } catch (e) {
    return { ok: false, capability: null, message: (e as Error).message };
  }
}

export type ClassifiedReason =
  | "invalid_token"
  | "expired_token"
  | "missing_scope"
  | "permission_not_approved"
  | "not_eligible"
  | "wrong_account"
  | "not_found"
  | "rate_limited"
  | "transient"
  | "unknown";

export interface ClassifiedError {
  reason: ClassifiedReason;
  message: string;
  code?: number;
  subcode?: number;
  type?: string;
}

/**
 * Classify a Meta error object into a stable reason code the UI can map to a precise message.
 */
export function classifyMetaError(err: any): ClassifiedError {
  const code: number | undefined = err?.code;
  const subcode: number | undefined = err?.error_subcode;
  const message: string = (err?.message || err?.error_user_msg || "").toString();
  const type: string | undefined = err?.type;
  const lower = message.toLowerCase();

  // 190 — invalid/expired token
  if (code === 190) {
    if (subcode === 463 || subcode === 467 || lower.includes("expired")) {
      return { reason: "expired_token", message, code, subcode, type };
    }
    return { reason: "invalid_token", message, code, subcode, type };
  }

  // 4 / 17 / 32 / 613 — rate limits
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return { reason: "rate_limited", message, code, subcode, type };
  }

  // 24 / 803 / 100 — not found / unknown object
  if (
    (code === 24 || code === 803 || code === 100) &&
    (lower.includes("does not exist") || lower.includes("nonexisting") || lower.includes("unsupported get"))
  ) {
    return { reason: "not_found", message, code, subcode, type };
  }

  // 10 — permission denied. Sub-classify by message wording.
  if (code === 10) {
    if (lower.includes("100 followers") || lower.includes("public") || lower.includes("not eligible")) {
      return { reason: "not_eligible", message, code, subcode, type };
    }
    if (lower.includes("approved") || lower.includes("unapproved") || lower.includes("review")) {
      return { reason: "permission_not_approved", message, code, subcode, type };
    }
    if (lower.includes("permission") || lower.includes("scope")) {
      return { reason: "missing_scope", message, code, subcode, type };
    }
    // Generic 10 — treat as missing_scope by default (most common cause)
    return { reason: "missing_scope", message, code, subcode, type };
  }

  // 5xx-ish transient
  if (code === 1 || code === 2) {
    return { reason: "transient", message, code, subcode, type };
  }

  return { reason: "unknown", message, code, subcode, type };
}
