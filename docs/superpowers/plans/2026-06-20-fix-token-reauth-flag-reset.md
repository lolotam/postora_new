# Fix Token Re-auth Health-Flag Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure that re-authenticating an expired platform token renews the `social_accounts` record AND clears the red `needs_reauth` flag (plus `failure_count`, `last_refresh_error`) so the dashboard banner, the "Action Required" badge, and the "Re-auth required" text all disappear.

**Architecture:** Four OAuth edge functions (`tiktok`, `pinterest`, `twitter`, `linkedin`) upsert tokens on re-auth but omit the health-reset block that `youtube` and `threads` already include. The fix is purely additive — add the same three fields to the existing upsert payloads. No schema, no frontend, and no query-invalidation changes are needed.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), `social_accounts` table.

---

## Root Cause (Confirmed via Pattern Analysis)

| Edge function | Renews tokens? | Resets `needs_reauth=false`? |
|---|---|---|
| `youtube-oauth` (reference) | ✅ | ✅ |
| `threads-oauth` (reference) | ✅ | ✅ |
| `whatsapp-oauth` (reference) | ✅ | ✅ |
| `tiktok-oauth` (BUGGY) | ✅ | ❌ |
| `pinterest-oauth` (BUGGY) | ✅ | ❌ |
| `twitter-oauth` (BUGGY) | ✅ | ❌ |
| `linkedin-oauth` (BUGGY) | ✅ | ❌ |

The UI signals are all driven by `needs_reauth`:
- Dashboard red banner (`TokenReauthBanner.tsx:36`) → `.eq("needs_reauth", true)`
- User page "Action Required" red badge (`PlatformAccountsTab.tsx:200`) → `account.needs_reauth`
- User page "Re-auth required" text (`PlatformAccountsTab.tsx`) → `needsReauth`
- Profile row flags (`ProfileRow.tsx:308,341,391,550`) → `acc.needs_reauth`
- Create-post "tokenExpired" (`usePostForm.tsx:361`) → `!!acc.needs_reauth`

So when the buggy functions leave `needs_reauth=true`, every red signal persists despite the success toast.

**Reference reset block** (from `youtube-oauth/index.ts:384-386`):
```ts
// Reset health tracking on successful reconnection
needs_reauth: false,
failure_count: 0,
last_refresh_error: null,
```

---

## File Structure

**Modify (4 files, one block each):**
- `supabase/functions/tiktok-oauth/index.ts` — add reset block to upsert (~line 194-215)
- `supabase/functions/pinterest-oauth/index.ts` — add reset block to upsert (~line 120-142)
- `supabase/functions/twitter-oauth/index.ts` — add reset block to upsert (~line 420-438)
- `supabase/functions/linkedin-oauth/index.ts` — add reset block to upsert (~line 449-471)

No files created. No schema migrations. No frontend changes.

---

### Task 1: Fix tiktok-oauth reset block

**Files:**
- Modify: `supabase/functions/tiktok-oauth/index.ts` (upsert object, before `account_metadata`)

- [ ] **Step 1: Add the health-reset block to the TikTok upsert**

In the `.upsert({...}, { onConflict: ... })` call, add the three fields alongside `is_active: true`:

```ts
is_active: true,
// Reset health tracking on successful reconnection
needs_reauth: false,
failure_count: 0,
last_refresh_error: null,
connected_at: new Date().toISOString(),
```

- [ ] **Step 2: Verify the edit landed inside the upsert payload**

Run: `grep -n "needs_reauth\|failure_count\|last_refresh_error" supabase/functions/tiktok-oauth/index.ts`
Expected: all three fields appear exactly once, inside the upsert object.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/tiktok-oauth/index.ts
git commit -m "fix(tiktok-oauth): reset needs_reauth/failure_count on reconnection"
```

---

### Task 2: Fix pinterest-oauth reset block

**Files:**
- Modify: `supabase/functions/pinterest-oauth/index.ts` (upsert object)

- [ ] **Step 1: Add the health-reset block to the Pinterest upsert**

```ts
is_active: true,
// Reset health tracking on successful reconnection
needs_reauth: false,
failure_count: 0,
last_refresh_error: null,
connected_at: new Date().toISOString(),
```

- [ ] **Step 2: Verify**

Run: `grep -n "needs_reauth\|failure_count\|last_refresh_error" supabase/functions/pinterest-oauth/index.ts`
Expected: all three fields appear once.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/pinterest-oauth/index.ts
git commit -m "fix(pinterest-oauth): reset needs_reauth/failure_count on reconnection"
```

---

### Task 3: Fix twitter-oauth reset block

**Files:**
- Modify: `supabase/functions/twitter-oauth/index.ts` (upsert object)

- [ ] **Step 1: Add the health-reset block to the Twitter upsert**

```ts
is_active: true,
// Reset health tracking on successful reconnection
needs_reauth: false,
failure_count: 0,
last_refresh_error: null,
connected_at: new Date().toISOString(),
```

- [ ] **Step 2: Verify**

Run: `grep -n "needs_reauth\|failure_count\|last_refresh_error" supabase/functions/twitter-oauth/index.ts`
Expected: all three fields appear once.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/twitter-oauth/index.ts
git commit -m "fix(twitter-oauth): reset needs_reauth/failure_count on reconnection"
```

---

### Task 4: Fix linkedin-oauth reset block

**Files:**
- Modify: `supabase/functions/linkedin-oauth/index.ts` (upsert object)

- [ ] **Step 1: Add the health-reset block to the LinkedIn upsert**

```ts
is_active: true,
// Reset health tracking on successful reconnection
needs_reauth: false,
failure_count: 0,
last_refresh_error: null,
connected_at: new Date().toISOString(),
```

- [ ] **Step 2: Verify**

Run: `grep -n "needs_reauth\|failure_count\|last_refresh_error" supabase/functions/linkedin-oauth/index.ts`
Expected: all three fields appear once.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/linkedin-oauth/index.ts
git commit -m "fix(linkedin-oauth): reset needs_reauth/failure_count on reconnection"
```

---

### Task 5: Deploy edge functions and frontend-verify

**Files:** none (operations only)

- [ ] **Step 1: Deploy the four fixed functions**

```bash
npx supabase functions deploy tiktok-oauth --project-ref efruibswazzuuupgyzmf
npx supabase functions deploy pinterest-oauth --project-ref efruibswazzuuupgyzmf
npx supabase functions deploy twitter-oauth --project-ref efruibswazzuuupgyzmf
npx supabase functions deploy linkedin-oauth --project-ref efruibswazzuuupgyzmf
```
Expected: each returns a success/deployment URL.

- [ ] **Step 2: Push the commits**

```bash
git push origin main
```

- [ ] **Step 3: Frontend verification via Playwright MCP**

Navigate to the live dashboard (or local dev), trigger a reconnect on an account that was flagged `needs_reauth`, and confirm:
1. Success toast appears
2. Dashboard red "Connection Expired" banner disappears for that account
3. User → Profiles page: the red "Action Required" badge reverts to green "Active"
4. "Re-auth required" text reverts to the normal expiry countdown

---

## Acceptance Criteria

1. ✅ After re-auth, `social_accounts.needs_reauth` is set to `false` (was staying `true`).
2. ✅ `failure_count` resets to `0` and `last_refresh_error` to `null`.
3. ✅ Dashboard `TokenReauthBanner` query returns 0 rows for that account → banner removed.
4. ✅ User page `PlatformAccountsTab` shows "Active" badge instead of "Action Required".
5. ✅ `usePostForm` no longer marks the account as `tokenExpired`.
6. ✅ Changes committed and pushed to `main`; four edge functions redeployed.

## Notes

- The upsert `onConflict: "user_id,platform,platform_user_id"` guarantees the SAME row is updated (not a duplicate), so the reset hits the right record.
- Instagram/Facebook/Bluesky/Reddit already reset `needs_reauth` in their own upserts (verified) — they are out of scope.
- `whatsapp-oauth` already resets correctly in its `existing`-branch update.
