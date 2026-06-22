---
title: Supabase Edge Runtime Per-Function Config Preflight Incident 2026-06-21
summary: 'Supabase Edge runtime per-function config preflight incident 2026-06-21: config/secret mismatch, deploy/rollback, and learnings.'
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:33:43.150Z'
updatedAt: '2026-06-22T06:33:43.150Z'
---
## Reason
Document configuration, issues, and resolution steps for Supabase Edge runtime per-function config incident on 2026-06-21

## Raw Concept
**Task:**
Document the Supabase Edge runtime per-function config preflight incident on 2026-06-21, covering technical findings, error patterns, and resolution.

**Changes:**
- Identified config/secret mismatch during deploy
- Preflight error surfaced due to per-function config state
- Rollback and redeploy sequence used to restore correct state
- Documented error patterns and mitigation steps

**Files:**
- platform logs
- deployment history

**Flow:**
Deploy function -> config mismatch triggers error -> preflight fails -> rollback -> redeploy with corrected config -> verify success

**Timestamp:** 2026-06-21

## Narrative
### Structure
Incident involved Supabase Edge preflight checks failing due to per-function config/secret mismatch. Diagnosis required correlating error logs with function configs and environment settings. Rollback and redeploy restored working state.

### Dependencies
Supabase CLI, Edge runtime, per-function config files, deployment platform, environment secrets.

### Highlights
Error signature: "Failed to validate function configuration". Rollback sequence resolved state drift. Key learning: always verify per-function configs and secrets pre-deploy.

### Rules
Rule: Always ensure per-function config and environment secrets are consistent before deploy. Rule: Use rollback if preflight fails and state drift is detected.

### Examples
Error example: "Failed to validate function configuration: ENV_SECRET_MISMATCH"; Recovery: revert config, reapply secrets, redeploy.

## Facts
- **frontend REST calls**: Frontend REST calls go to api.postora.cloud; there are no calls to the old hosted Supabase or curemed.
- **CSP websocket policy**: Realtime websocket to wss://api.postora.cloud is blocked because the CSP meta tag only permits wss://supabase.postora.cloud.
- **CSP configuration**: supabase.postora.cloud appears in the frontend runtime as a stale CSP entry, causing a mismatch.
- **deployed frontend network calls**: Deployed frontend calls api.postora.cloud, confirmed via network.
- **local .env configuration**: Local .env still has VITE_SUPABASE_URL="https://supabase.postora.cloud", indicating local/deployed config drift.
- **CSP source**: The CSP blocking wss://api.postora.cloud is not in index.html but is an HTTP response header.
- **CSP header**: CSP source is a Cloudflare HTTP response header: connect-src 'self' https: wss://supabase.postora.cloud.
- **CSP effect**: The https: wildcard in CSP allows REST calls to api.postora.cloud to succeed, but wss: is locked to only supabase.postora.cloud, so the Supabase Realtime websocket to api.postora.cloud is blocked.
- **deployed JS fetch**: The deployed JS grep came back empty; either the fetch was blocked by Cloudflare or returned 0 bytes.
- **Phase 1**: Phase 1 is done (result.json ready).
- **Phase 4**: Phase 4 never launched due to redirect failure.
- **Phase 1 result**: Phase 1 result: DNS solid, but TLS failed inside Codex's sandbox (Windows Schannel SEC_E_NO_CREDENTIALS — a known sandbox quirk, not a real server issue).
- **api.postora.cloud DNS**: api.postora.cloud resolves to 104.21.30.131, 172.67.172.240 (Cloudflare).
- **efruibswazzuuupgyzmf.supabase.co DNS**: efruibswazzuuupgyzmf.supabase.co resolves to 104.18.38.10, 172.64.149.246.
- **supabase.postora.cloud/postora.cloud/old.postora.cloud DNS**: supabase.postora.cloud, postora.cloud, old.postora.cloud all resolve to 104.21.30.131, 172.67.172.240.
- **API old-host risk**: API OLD-HOST RISK: NO.
- **Phase 4**: Phase 4 re-dispatched (PID 3132).
- **Phase 1 HTTP table**: Phase 1 HTTP table: api.postora.cloud → 401 (Kong/Supabase auth root, reachable), supabase.postora.cloud → 401 (same, reachable), postora.cloud → 200 (frontend), old.postora.cloud → 200.
- **TLS validation**: TLS succeeded on all endpoints (got real codes, not 000; certs valid; Cloudflare edge).
- **Cloudflare index.html variant**: Cloudflare serves a variant of index.html without script tags to that user agent, causing the JS fetch to return empty.
- **deployed build endpoint**: Definitive runtime proof from Playwright shows the deployed build uses api.postora.cloud.
- **Phase 4 source data**: Phase 4 source data captured; Codex's grep output is in stdout.log and is rich and complete.
- **OAuth endpoint resolution**: All OAuth uses supabase.functions.invoke("<provider>-oauth"), which resolves to ${VITE_SUPABASE_URL}/functions/v1/<provider>-oauth; OAuth host is whatever VITE_SUPABASE_URL is at build time.
- **OAuth edge functions**: OAuth edge functions present: facebook, instagram, tiktok, youtube, linkedin, twitter, pinterest, bluesky, threads, reddit, whatsapp, manage-oauth-redirects, mcp-oauth.
- **hardcoded api.postora.cloud**: Hardcoded api.postora.cloud literals (bypass env, baked in) are present in src/lib/supabaseStudio.ts, api-docs, ApiKeys, Documentation, all docs/*Api.tsx, McpConnectionPanel — all correctly use api.postora.cloud.
- **old-host hardcodes**: No old-host hardcodes in production src/; efruibswazzuuupgyzmf and curemed appear only in tests as negative assertions.
- **CSP regression test**: cspRegression.test.ts:16 actively asserts CSP contains wss://supabase.postora.cloud; this lock is why the deployed CSP blocks wss://api.postora.cloud.
- **config drift**: Config drift: local .env, .env.example, README.md, scripts/upload_logos.* all default to supabase.postora.cloud, while the deployed build uses api.postora.cloud.
