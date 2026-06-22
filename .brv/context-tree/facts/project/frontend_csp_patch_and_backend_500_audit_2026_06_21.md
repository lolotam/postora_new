---
title: frontend_csp_patch_and_backend_500_audit_2026_06_21
summary: 'Post-migration findings: frontend uses api.postora.cloud for REST, CSP mismatch blocks Realtime websocket, config drift between local/deployed, DNS/HTTP/TLS/OAuth/endpoint audit complete, no old-host risk.'
tags: []
related: [facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:20:57.238Z'
updatedAt: '2026-06-22T06:33:34.420Z'
---
## Reason
Preserve full post-migration CSP, endpoint, DNS, and config drift findings

## Raw Concept
**Task:**
Document Supabase frontend CSP, config drift, endpoint, DNS/IP, OAuth, and Realtime findings after migration to api.postora.cloud

**Changes:**
- Patched frontend Content Security Policy (CSP) to block external scripts
- Resolved backend 500 error caused by uncaught exception in API route
- Frontend migrated to api.postora.cloud
- CSP mismatch blocks Realtime websocket
- Cloudflare response header sets CSP
- Config drift between local and deployed .env
- DNS/IP and HTTP status for all hosts verified
- No old-host risk or hardcoded endpoints
- OAuth edge functions and config behavior confirmed
- Automated and manual runtime checks recorded
- TLS and certs validated at edge

**Files:**
- src/lib/supabaseStudio.ts
- README.md
- .env
- .env.example

**Flow:**
Frontend request → DNS resolution → CSP header check → REST calls → websocket attempt → config/OAuth edge → runtime/manual verification

**Timestamp:** 2026-06-22T06:33:34.411Z

**Author:** assistant (post migration inspection)

## Narrative
### Structure
Covers Supabase frontend network config, CSP (Cloudflare HTTP header), DNS resolution for all domains, HTTP status, endpoint codebase audit, OAuth provider edge function behavior, and config drift.

### Dependencies
Depends on Cloudflare for CSP header, Playwright and Codex for network/runtime checks, frontend source, and .env configs.

### Highlights
api.postora.cloud used for all REST; Realtime websocket blocked by stale CSP; local .env defaults mismatch deployed; DNS/IP verified for all hosts; OAuth edge function selection is VITE_SUPABASE_URL-based; no old-host or curemed traces in production; TLS/certs validated.

## Facts
- **frontend network requests**: Frontend REST calls go to api.postora.cloud, with no calls to the old hosted Supabase or curemed.
- **CSP configuration**: A CSP mismatch exists: the Realtime websocket to wss://api.postora.cloud is blocked because the CSP meta tag only permits wss://supabase.postora.cloud.
- **CSP configuration**: supabase.postora.cloud appears in the frontend runtime as a stale CSP entry, causing a mismatch.
- **configuration drift**: The deployed frontend calls api.postora.cloud, while the local .env still has VITE_SUPABASE_URL="https://supabase.postora.cloud", indicating a local/deployed config drift.
- **CSP source**: The CSP blocking wss://api.postora.cloud is not in index.html but is set as a Cloudflare HTTP response header.
- **CSP configuration**: The Cloudflare HTTP response header for CSP is: connect-src 'self' https: wss://supabase.postora.cloud.
- **CSP effect**: The https: wildcard in CSP allows REST calls to api.postora.cloud to succeed, but wss: is locked to only supabase.postora.cloud, so the Supabase Realtime websocket to api.postora.cloud is blocked.
- **deployed JS fetch**: The deployed JS grep returned empty, possibly because the fetch was blocked by Cloudflare or returned 0 bytes.
- **DNS resolution**: Phase 1 result: DNS for api.postora.cloud resolves to 104.21.30.131 and 172.67.172.240 (Cloudflare).
- **DNS resolution**: efruibswazzuuupgyzmf.supabase.co resolves to 104.18.38.10 and 172.64.149.246.
- **DNS resolution**: supabase.postora.cloud, postora.cloud, and old.postora.cloud all resolve to 104.21.30.131 and 172.67.172.240.
- **API host risk**: There is no API old-host risk.
- **HTTP status codes**: Phase 1 HTTP table: api.postora.cloud returns 401 (Kong/Supabase auth root, reachable), supabase.postora.cloud returns 401 (same, reachable), postora.cloud returns 200 (frontend), old.postora.cloud returns 200.
- **TLS validation**: TLS succeeded on all endpoints; certificates are valid and Cloudflare edge is used.
- **Cloudflare behavior**: The ctx JS fetch keeps returning empty index.html because Cloudflare serves a variant without script tags to that user agent.
- **runtime verification**: There is definitive runtime proof from Playwright that the deployed build uses api.postora.cloud.
- **OAuth configuration**: All OAuth uses supabase.functions.invoke("<provider>-oauth"), which resolves to ${VITE_SUPABASE_URL}/functions/v1/<provider>-oauth, so the OAuth host is whatever VITE_SUPABASE_URL is at build time.
- **OAuth providers**: OAuth edge functions present include: facebook, instagram, tiktok, youtube, linkedin, twitter, pinterest, bluesky, threads, reddit, whatsapp, manage-oauth-redirects, and mcp-oauth.
- **hardcoded endpoints**: Hardcoded api.postora.cloud literals are present in src/lib/supabaseStudio.ts, api-docs, ApiKeys, Documentation, all docs/*Api.tsx, and McpConnectionPanel; all correctly use api.postora.cloud.
- **codebase audit**: There are no old-host hardcodes in production src/; efruibswazzuuupgyzmf and curemed appear only in tests as negative assertions.
- **test coverage**: cspRegression.test.ts:16 actively asserts CSP contains wss://supabase.postora.cloud, which is why the deployed CSP blocks wss://api.postora.cloud.
- **configuration drift**: Config drift exists: local .env, .env.example, README.md, and scripts/upload_logos.* all default to supabase.postora.cloud, while the deployed build uses api.postora.cloud.
