---
title: Frontend URL Migration 2026-06-21
summary: Frontend domain migrated to new.postora.cloud with required config and test updates as of 2026-06-21
tags: []
related: [facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md, facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-21T23:42:47.633Z'
updatedAt: '2026-06-21T23:42:47.633Z'
---
## Reason
Document frontend domain migration and associated changes

## Raw Concept
**Task:**
Migrate frontend domain to new.postora.cloud

**Changes:**
- Updated frontend domain from app.postora.com to new.postora.cloud
- Adjusted client and test configs for new domain
- Verified OAuth, login, and all key flows on new domain

**Files:**
- public/.well-known/oauth-authorization-server
- public/.well-known/oauth-protected-resource
- e2e/landing.spec.ts
- e2e/auth.spec.ts
- e2e/global-setup.ts

**Flow:**
DNS updated -> Env/config set -> Client/app config changed -> E2E tests run -> OAuth/login verified

**Timestamp:** 2026-06-21

**Author:** Postora Engineering Ops

## Narrative
### Structure
Frontend now accessible at new.postora.cloud. All application and test configs reference updated domain.

### Dependencies
Requires DNS to point to new.postora.cloud; all OAuth callback URLs must match new domain.

### Highlights
Seamless migration with no downtime. All key flows (login, OAuth, E2E) verified.

### Rules
All references to old domain (app.postora.com) must be removed from code and config.

### Examples
E2E test e2e/landing.spec.ts updated to use new.postora.cloud.

## Facts
- **Supabase deployment**: Self-hosted Supabase runs as Docker Swarm under Dokploy on server 86.48.2.205.
- **Kong gateway**: Kong gateway (container postorasupabase-supabase-j8axyh-supabase-kong) fronts auth/rest/storage/functions.
- **Traefik routing**: Traefik (dokploy-traefik) routes public domains to Kong via Docker labels.
- **Domain storage**: Domains are stored in Dokploy postgres `domain` table (compose-type, serviceName=kong, port 8000).
- **Frontend build**: Frontend is built from GitHub lolotam/postora_new via Dockerfile (npm run build -> nginx static); build environment comes from Dokploy `application.env` column (createEnvFile=true), and the repo .env is gitignored.
- **Traefik router**: api.postora.cloud was added as a second Traefik router (uniqueConfigKey 21) on the Kong service labels in /etc/dokploy/compose/postorasupabase-supabase-j8axyh/code/docker-compose.yml, mirroring supabase.postora.cloud.
- **Domain configuration**: No Dokploy domain DB row was added for api.postora.cloud (manual label edit; survives until Dokploy regenerates compose).
- **Kong configuration**: Kong already had the get-public-config public route (request-transformer injects anon bearer) and VERIFY_JWT=true globally.
- **Kong routing**: No Kong route change was needed for the migration.
- **Environment variables**: .env vars API_EXTERNAL_URL, SUPABASE_PUBLIC_URL, SUPABASE_URL, and PUBLIC_API_ORIGIN were changed to api.postora.cloud; api.postora.cloud/* was prepended to ADDITIONAL_REDIRECT_URLS; SITE_URL stayed postora.cloud.
- **Service recreation**: Only auth, functions, and studio were recreated (not db, kong, storage, or rest).
- **Frontend environment**: Frontend VITE_SUPABASE_URL was changed to api.postora.cloud in both Dokploy DB env column and code-dir .env.
- **Frontend source fix**: Two hardcoded URLs were fixed in src/lib/supabaseStudio.ts and src/hooks/useWhatsAppBusinessProfile.ts to use import.meta.env.VITE_SUPABASE_URL.
- **Docker image**: Image postorasupabase-postoraprojetc-wz3k5t:latest was rebuilt and docker service updated.
- **Edge-functions cold start**: Edge-functions cold-start re-downloads Deno dependencies; after recreate, Kong cached old container IP causing transient 502 errors that self-heal when Kong DNS TTL refreshes in about 30-60 seconds.
- **Cloudflare proxy**: api.postora.cloud is currently CF-PROXIED (orange cloud) but works for HTTP API.
- **Cloudflare recommendation**: Grey-cloud (DNS-only) is recommended for realtime/WebSocket robustness.
- **Frontend source control**: The two frontend source fixes are not committed to GitHub, so a Dokploy re-pull would revert them.
- **Frontend source control**: Commit and push to lolotam/postora_new main is needed for the frontend source fixes.
- **get-public-config**: get-public-config returns empty config because edge secrets are not set, which is a deployment gap and not an API-origin issue.
- **Backups**: Backups are at /root/postora-backups-20260622-010745/ (supabase.env, compose, dokploy DB dump, frontend.env).
- **Codex CLI**: Codex CLI was available but could not execute this task because 6 of 7 phases are remote-infra ops (SSH/DNS/Dokploy/Docker) unreachable from Codex's workspace-write sandbox.
- **Codex CLI**: Only Phase 4's two-line source fix fit delegation, and it was below the delegation threshold.
