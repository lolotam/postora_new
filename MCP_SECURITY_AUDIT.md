# Postora MCP Security Audit

## Scope and method

This review covers only `supabase/functions/mcp/index.ts` and `supabase/functions/mcp-oauth/index.ts`. It is a static source review; no code, tests, network calls, deployments, or database operations were run.

## Findings

### MCP-SEC-001 — OAuth scopes are recorded but never enforced

- **Severity:** High
- **File:line:** `supabase/functions/mcp-oauth/index.ts:84-90`, `supabase/functions/mcp-oauth/index.ts:179`, `supabase/functions/mcp-oauth/index.ts:202-210`, `supabase/functions/mcp-oauth/index.ts:392-396`, `supabase/functions/mcp/index.ts:50-72`, `supabase/functions/mcp/index.ts:132-263`
- **Code-or-Design:** Code
- **Description:** The authorization server advertises supported scopes, parses the requested `scope`, stores it, displays it at consent, and copies it into the token row. The MCP resource server then resolves an OAuth token by selecting only identity/expiry fields, converts it to the user's unrestricted Postora API key, and registers every read and write tool without checking the token's scopes. A client approved for `accounts:read` (or even an unknown/deceptive scope string) can therefore create posts, upload media, and manage webhooks with the same authority as a full-scope token.
- **Fix recommendation:** Validate requested scopes against the server-supported set and the client's registered allowance, persist the granted subset, and return invalid-scope errors for unsupported values. Select scopes during token resolution and enforce a required scope at each MCP tool handler before forwarding the request; do not convert a scoped OAuth token into an unrestricted capability without an authorization check.

### MCP-SEC-002 — Authorization-code redemption and refresh-token rotation are non-atomic

- **Severity:** High
- **File:line:** `supabase/functions/mcp-oauth/index.ts:350-357`, `supabase/functions/mcp-oauth/index.ts:387-396`, `supabase/functions/mcp-oauth/index.ts:404-425`, `supabase/functions/mcp-oauth/index.ts:432-449`
- **Code-or-Design:** Code
- **Description:** Authorization-code redemption reads `code_used_at`, then performs a separate unconditional update, ignores the update result, and issues tokens in another insert. Concurrent requests can both observe an unused code and each receive a token pair. Refresh rotation has the same check-then-update race: parallel requests can both observe an unrevoked refresh token, revoke it, and independently issue valid successor token families, enabling code replay and refresh-token replay despite the intended single-use semantics.
- **Fix recommendation:** Move consume-and-issue operations into database transactions/RPCs. Claim an authorization code with a conditional update such as `WHERE code_used_at IS NULL` and require exactly one affected row; rotate refresh tokens with an equivalent compare-and-swap, insert the successor in the same transaction, and revoke the entire token family if reuse is detected.

### MCP-SEC-003 — Refresh grants bypass confidential-client authentication

- **Severity:** High
- **File:line:** `supabase/functions/mcp-oauth/index.ts:120-130`, `supabase/functions/mcp-oauth/index.ts:314-323`, `supabase/functions/mcp-oauth/index.ts:399-429`
- **Code-or-Design:** Code
- **Description:** Registration supports `client_secret_basic` and `client_secret_post`, and authorization-code redemption checks those secrets, but the refresh path receives no request headers, treats `client_id` as optional, and never authenticates the client. Theft of a confidential client's refresh token is therefore sufficient to mint new access and refresh tokens without the client secret.
- **Fix recommendation:** Pass the request into the refresh handler, resolve the token's client, and apply the same registered token-endpoint authentication method used for authorization-code redemption. Require an exact client binding and reject public/confidential authentication mismatches before consuming the refresh token.

### MCP-SEC-004 — Dynamic Client Registration is anonymous and unbounded

- **Severity:** Medium
- **File:line:** `supabase/functions/mcp-oauth/index.ts:97-164`, `supabase/functions/mcp-oauth/index.ts:557-559`
- **Code-or-Design:** Design
- **Description:** `/register` is publicly routable without an initial access token, rate limit, registration quota, or visible request-size/count limits. It also accepts arbitrary URI schemes and largely unvalidated metadata/grant arrays, allowing database/resource exhaustion and large numbers of phishing-oriented client registrations.
- **Fix recommendation:** Require an initial access token or explicitly documented trust policy, add per-IP and global quotas, cap body and array sizes, and validate all client metadata. Apply redirect URI rules by client type, including exact HTTPS rules for web clients and constrained loopback/custom-scheme rules for native clients.

### MCP-SEC-005 — No application-level rate limiting on token, revocation, or registration endpoints

- **Severity:** Medium
- **File:line:** `supabase/functions/mcp-oauth/index.ts:314-325`, `supabase/functions/mcp-oauth/index.ts:460-469`, `supabase/functions/mcp-oauth/index.ts:557-574`
- **Code-or-Design:** Design
- **Description:** The router invokes `/register`, `/token`, and `/revoke` without any visible throttling or abuse control. Token values have strong entropy, so online guessing is not practical, but attackers can still drive repeated hashing and service-role database reads/writes, amplify registration growth, and degrade availability.
- **Fix recommendation:** Add gateway and server-side rate limits keyed by IP, client ID, and account/token family, with stricter limits for failures. Bound request sizes, monitor abuse signals, and return standards-compatible throttling responses without exposing whether a credential exists.

### MCP-SEC-006 — Wildcard CORS covers authenticated consent and session APIs

- **Severity:** Medium
- **File:line:** `supabase/functions/mcp-oauth/index.ts:19-24`, `supabase/functions/mcp-oauth/index.ts:26-29`, `supabase/functions/mcp-oauth/index.ts:541`, `supabase/functions/mcp/index.ts:11-17`, `supabase/functions/mcp/index.ts:320-323`
- **Code-or-Design:** Design
- **Description:** Both services return `Access-Control-Allow-Origin: *`; the OAuth service also permits the `Authorization` header used by consent and session routes. This does not by itself expose browser credentials because credentialed CORS is not enabled, but it allows any origin to invoke and read these APIs with any bearer/JWT it can obtain, unnecessarily widening the impact of token exposure and browser-based abuse.
- **Fix recommendation:** Restrict user-authenticated consent/session endpoints to the trusted Postora application origins and emit `Vary: Origin`. Keep cross-origin access only on OAuth/MCP endpoints that require it for interoperability, using a documented allowlist or route-specific policy.

### MCP-SEC-007 — OAuth `state` is optional

- **Severity:** Low
- **File:line:** `supabase/functions/mcp-oauth/index.ts:167-179`, `supabase/functions/mcp-oauth/index.ts:202-210`, `supabase/functions/mcp-oauth/index.ts:288-310`
- **Code-or-Design:** Design
- **Description:** The server parses and faithfully returns `state` when supplied, but accepts an empty value and omits it from the result. PKCE materially limits code injection, yet clients that fail to add their own correlation value remain exposed to authorization-response mix-up/login-CSRF classes of attack.
- **Fix recommendation:** Require a non-empty, size-bounded `state` value for this integration profile, store it with the authorization, and always return it on success or denial. Document that clients must bind it to the initiating browser session and verify it exactly.

### MCP-SEC-008 — PKCE values are not syntax- or length-validated

- **Severity:** Low
- **File:line:** `supabase/functions/mcp-oauth/index.ts:176-187`, `supabase/functions/mcp-oauth/index.ts:327-371`
- **Code-or-Design:** Code
- **Description:** S256 and the presence of a challenge/verifier are enforced, but the server accepts arbitrary challenge and verifier lengths/characters. A non-compliant client can therefore establish a low-entropy verifier, weakening interception resistance, while oversized values also create avoidable processing/storage pressure.
- **Fix recommendation:** Enforce the PKCE verifier character set and 43–128 character length, and require an S256 challenge with the expected base64url form and length. Reject malformed values before storing or hashing them.

### MCP-SEC-009 — Internal error details are returned to callers

- **Severity:** Low
- **File:line:** `supabase/functions/mcp-oauth/index.ts:152`, `supabase/functions/mcp-oauth/index.ts:216-217`, `supabase/functions/mcp-oauth/index.ts:306`, `supabase/functions/mcp-oauth/index.ts:449`, `supabase/functions/mcp-oauth/index.ts:486`, `supabase/functions/mcp-oauth/index.ts:519`, `supabase/functions/mcp-oauth/index.ts:595-597`, `supabase/functions/mcp/index.ts:120-129`
- **Code-or-Design:** Code
- **Description:** Several responses expose raw Supabase/database error messages, the top-level catch returns the thrown exception message, and MCP tool failures echo complete upstream response bodies. These paths can disclose schema, constraint, provider, or implementation details and may leak sensitive fields if an upstream error payload includes them; no direct token logging was found.
- **Fix recommendation:** Return stable public error codes and generic descriptions while logging sanitized diagnostic details server-side with correlation IDs. Explicitly redact authorization headers, tokens, API keys, database details, and upstream response fields before any log or client response.

### MCP-SEC-010 — Registered redirect URI matching prevents a direct `/authorize` open redirect

- **Severity:** Informational
- **File:line:** `supabase/functions/mcp-oauth/index.ts:191-200`, `supabase/functions/mcp-oauth/index.ts:288-310`
- **Code-or-Design:** Code
- **Description:** `/authorize` requires the supplied redirect URI to exactly match a URI stored for the client, and consent constructs its result from that stored value. No direct open redirect for an existing client was identified; the separate risk is the permissive anonymous registration policy described in MCP-SEC-004.
- **Fix recommendation:** Preserve exact matching and add stricter redirect registration validation by client type. Do not introduce wildcard, prefix, or substring matching.

### MCP-SEC-011 — Token generation and at-rest handling use appropriate primitives

- **Severity:** Informational
- **File:line:** `supabase/functions/mcp-oauth/index.ts:38-55`, `supabase/functions/mcp-oauth/index.ts:125-130`, `supabase/functions/mcp-oauth/index.ts:432-447`, `supabase/functions/mcp/index.ts:40-57`
- **Code-or-Design:** Code
- **Description:** Access and refresh tokens use 32 bytes from `crypto.getRandomValues` (256 bits before base64url encoding), client secrets use the same strength, client IDs use 128 random bits, and only SHA-256 hashes are stored/looked up. No hard-coded secret, development bypass, or backdoor was found in the audited files.
- **Fix recommendation:** Retain these primitives and lengths. Continue ensuring plaintext access/refresh tokens appear only in the successful token response and are never logged.

### MCP-SEC-012 — OAuth token revocation is checked on every MCP request

- **Severity:** Informational
- **File:line:** `supabase/functions/mcp/index.ts:47-57`, `supabase/functions/mcp-oauth/index.ts:460-469`
- **Code-or-Design:** Design
- **Description:** OAuth bearer tokens are resolved through the token table on each MCP request, including `revoked_at` and expiry checks, so there is no application cache creating revocation lag. The `.or(...)` revocation filter is built only from a server-generated SHA-256 base64url hash, so no attacker-controlled SQL/PostgREST expression injection was identified in this path.
- **Fix recommendation:** Preserve per-request revocation checks or use only a cache with immediate invalidation. Add database error handling to revocation so a failed update is observable rather than always returning success.

## Executive summary

The audited implementation has sound token entropy, hashed token storage, exact redirect matching, mandatory S256 PKCE presence, and per-request revocation checks, but it does not yet provide the authorization and replay guarantees its OAuth surface claims. Most importantly, OAuth scopes do not restrict any MCP operation, authorization codes and refresh tokens can be redeemed concurrently because consumption is non-atomic, and confidential-client authentication is skipped during refresh. Public unbounded client registration, absent rate limiting, broad CORS, permissive state/PKCE validation, and raw internal error responses add further abuse and disclosure risk. These issues are reachable in the committed server paths and should be corrected before deployment.

**Verdict: DO NOT DEPLOY**

## Counts by severity

- Critical: 0
- High: 3
- Medium: 3
- Low: 3
- Informational: 3
- Total: 12
