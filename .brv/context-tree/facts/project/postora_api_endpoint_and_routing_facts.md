---
title: Postora API Endpoint and Routing Facts
summary: Documents main API endpoint, desired API paths, frontend and rollback URLs, backup alias, and strict process controls for migration.
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:17:24.458Z'
updatedAt: '2026-06-22T06:17:24.458Z'
---
## Reason
Document the canonical API endpoint, routing paths, frontend/rollback configuration, and strict rules for migration.

## Raw Concept
**Task:**
Document the canonical Postora API endpoint, routing, frontend and rollback URLs, backup alias, and strict process rules for migration.

**Changes:**
- Enumerated API endpoint, paths, and frontend/rollback URLs.
- Preserved strict process boundaries for DNS and deployment.
- Noted CLI/tooling constraints and phase responsibilities.

**Flow:**
API and frontend migration planning -> Endpoint and DNS verification -> API path tests -> Frontend and rollback checks -> Strict process controls

**Timestamp:** 2026-06-22

**Author:** PI Agent

## Narrative
### Structure
Documents all endpoints and URLs involved in the migration (api.postora.cloud, supabase.postora.cloud, postora.cloud, old.postora.cloud) and the rules for API migration and rollback.

### Dependencies
Requires coordinated DNS, Kong, and Supabase configuration; browser phases require Playwright; CLI phases require Codex CLI.

### Highlights
Strict separation of read-only, DNS, and deployment actions; ensures no unintentional changes during migration; codified migration safety rules.

### Rules
Strict rules: read-only only, never edit DNS/Dokploy/env, do not deploy or restart containers, do not print secrets; browser inspection must be done outside Codex CLI.

### Examples
Example: migrating the frontend to use api.postora.cloud and verifying no legacy Supabase endpoints remain.

## Facts
- **API endpoint**: The desired API endpoint is https://api.postora.cloud.
- **API paths**: The desired API paths are https://api.postora.cloud/auth/v1/, https://api.postora.cloud/rest/v1/, https://api.postora.cloud/storage/v1/, https://api.postora.cloud/functions/v1/get-public-config, https://api.postora.cloud/functions/v1/facebook-oauth, and https://api.postora.cloud/functions/v1/instagram-oauth.
- **frontend**: The desired frontend is https://postora.cloud.
- **rollback**: The desired rollback is https://old.postora.cloud.
- **backup alias**: The backup alias is https://supabase.postora.cloud.
- **Dokploy Kong domain**: User screenshot showed a Dokploy Kong domain named only 'api'.
- **process**: Strict rules include: read-only only, do not edit Dokploy, do not edit DNS, do not edit env, do not deploy, do not restart containers, do not print secrets.
- **Codex**: Codex has no browser, so the browser-inspection phases (3 and 5) cannot be done by Codex.
- **Playwright**: Browser-inspection phases will be run directly with Playwright.
- **Codex**: The curl/DNS phase (1), the API-path phase (2), and the source-reading phase (4) will be delegated to Codex.
- **Codex CLI**: Codex CLI 0.141.0 is available and the relay helper exists.
- **Codex CLI**: Codex CLI 0.141.0 is installed and the relay helper works.
- **F:/Postora_new**: The repo at F:/Postora_new is a valid git repo.
- **Phase 1**: Phase 1 is running in the background (PID 3090).
- **Codex**: Codex works on DNS/HTTP.
- **Phase 3**: Phase 3 will be started with Playwright for browser inspection.
- **Codex**: Codex cannot do browser inspection.
