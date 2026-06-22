---
title: supabase_edge_function_deploy_and_credential_facts
summary: Supabase Edge Function deployment steps, credential setup, production build, and troubleshooting facts as of 2026-06-22
tags: []
related: [facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md, facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:33:20.447Z'
updatedAt: '2026-06-22T06:33:20.447Z'
---
## Reason
Curate RLM-extracted facts and process details for Supabase Edge Function deployment and credential handling

## Raw Concept
**Task:**
Document Supabase Edge Function deployment, credential setup, production build, and troubleshooting findings

**Changes:**
- Described CLI login and credential storage for Supabase Edge Function deployment
- Outlined production build process and troubleshooting steps
- Captured recommendations for environment variable and credential handling
- Summarized knowledge as of 2026-06-22

**Files:**
- docs/EXTERNAL-DEVELOPER-GUIDE.md

**Flow:**
Install CLI -> Login (store .supabase credentials) -> Deploy/Build -> Troubleshoot errors -> Validate .env and production config

**Timestamp:** 2026-06-22

**Author:** Postora Engineering

## Narrative
### Structure
Stepwise process for deploying and building Supabase Edge Functions, including credential login, .env setup, and troubleshooting edge build/deploy issues

### Dependencies
Requires Supabase CLI, correct .env and .supabase credentials, and valid project configuration

### Highlights
Production builds use local .env and CLI-stored credentials; troubleshooting includes permission errors and project ref checks; environment variable management is critical for both local and cloud deploys

### Rules
Always login via Supabase CLI before deploy; store credentials in ~/.supabase; .env must match project config; never commit credentials to source control

### Examples
Example command: supabase login; Troubleshooting: If deploy fails, check ~/.supabase/credentials and project ref; Production build: supabase functions build --prod

## Facts
- **frontend REST calls**: Frontend REST calls go to api.postora.cloud (no calls to old hosted/curemed).
- **CSP meta tag**: Realtime websocket to wss://api.postora.cloud is blocked because the CSP meta tag only permits wss://supabase.postora.cloud.
- **supabase.postora.cloud**: supabase.postora.cloud appears in the frontend runtime as a stale CSP entry.
- **deployed frontend**: Deployed frontend calls api.postora.cloud (confirmed via network).
- **local .env**: Local .env still has VITE_SUPABASE_URL="https://supabase.postora.cloud" — this is a local/deployed config drift.
- **CSP source**: The CSP blocking wss://api.postora.cloud is not in index.html (grep found nothing), so it's an HTTP response header.
- **CSP source**: CSP source confirmed: it's a Cloudflare HTTP response header (Server: cloudflare) — connect-src 'self' https: wss://supabase.postora.cloud.
- **CSP configuration**: The https: wildcard lets REST calls to api.postora.cloud succeed, but wss: is locked to only supabase.postora.cloud, so the Supabase Realtime websocket to api.postora.cloud is blocked.
- **deployed JS fetch**: The deployed JS grep came back empty — either the fetch was blocked by Cloudflare or returned 0 bytes.
- **Phase 1**: Phase 1 is done (result.json ready).
- **Phase 4**: Phase 4 never launched (redirect failed).
- **Codex sandbox TLS**: Phase 1 result (Codex) — DNS solid, but TLS failed inside Codex's sandbox (Windows Schannel SEC_E_NO_CREDENTIALS — a known sandbox quirk, not a real server issue).
- **api.postora.cloud DNS**: api.postora.cloud resolves to 104.21.30.131, 172.67.172.240 (Cloudflare).
- **efruibswazzuuupgyzmf.supabase.co DNS**: efruibswazzuuupgyzmf.supabase.co resolves to 104.18.38.10, 172.64.149.246.
- **supabase.postora.cloud/postora.cloud/old.postora.cloud DNS**: supabase.postora.cloud, postora.cloud, old.postora.cloud all resolve to 104.21.30.131, 172.67.172.240.
- **API old-host risk**: API OLD-HOST RISK: NO.
- **Phase 4**: Phase 4 re-dispatched (PID 3132).
- **Phase 1 HTTP table**: Phase 1 HTTP table complete (my curl works): api.postora.cloud → 401 (Kong/Supabase auth root, reachable), supabase.postora.cloud → 401 (same, reachable), postora.cloud → 200 (frontend), old.postora.cloud → 200.
- **TLS status**: TLS succeeded on all (got real codes, not 000 → certs valid; Cloudflare edge).
- **ctx JS fetch**: The ctx JS fetch keeps returning empty index.html (Cloudflare serves a variant without script tags to that UA).
- **deployed build**: Definitive runtime proof from Playwright that the deployed build uses api.postora.cloud.
- **Phase 4 source data**: Phase 4 source data captured (Codex's grep output is in stdout.log — rich and complete).
- **OAuth host**: All OAuth uses supabase.functions.invoke("<provider>-oauth") → resolves to ${VITE_SUPABASE_URL}/functions/v1/<provider>-oauth. So OAuth host = whatever VITE_SUPABASE_URL is at build time.
- **OAuth edge functions**: OAuth edge functions present: facebook, instagram, tiktok, youtube, linkedin, twitter, pinterest, bluesky, threads, reddit, whatsapp, manage-oauth-redirects, mcp-oauth.
- **hardcoded api.postora.cloud**: Hardcoded api.postora.cloud literals (bypass env, baked in): src/lib/supabaseStudio.ts, api-docs, ApiKeys, Documentation, all docs/*Api.tsx, McpConnectionPanel — all correctly api.postora.cloud.
- **old-host hardcodes**: No old-host hardcodes in production src/ (efruibswazzuuupgyzmf / curemed appear only in tests as negative assertions).
- **cspRegression.test.ts:16**: cspRegression.test.ts:16 actively asserts CSP contains wss://supabase.postora.cloud — this lock is why the deployed CSP blocks wss://api.postora.cloud.
- **config drift**: Config drift: local .env, .env.example, README.md, scripts/upload_logos.* all default to supabase.postora.cloud, while the deployed build uses api.postora.cloud.
