---
title: Supabase DB Container PG Version Mismatch Incident 2026-06-21
summary: 'Supabase local dev incident: container ran PostgreSQL 15.3, project required 15.1, causing migration failure (2026-06-21).'
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md]
keywords: []
createdAt: '2026-06-21T23:27:06.064Z'
updatedAt: '2026-06-22T08:28:28.559Z'
---
## Reason
Document Supabase local dev database version mismatch issue and resolution

## Raw Concept
**Task:**
Document project fact: Supabase database container version mismatch incident (2026-06-21)

**Changes:**
- Supabase DB container reported PostgreSQL 16.3, but project was using 15.3
- Supabase CLI and deployment images defaulted to v16.3 after upstream update
- Database schema migration failed due to version mismatch
- Temporary downgrade and manual migration performed
- Locked migration image version to 15.3 for deployment consistency
- Reported database container version mismatch during Supabase local development
- Identified: Container running PostgreSQL 15.3, project expects PostgreSQL 15.1
- Impact: Schema migration failed due to version incompatibility

**Files:**
- supabase/migrations/
- docs/ADMIN-DASHBOARD-IMPLEMENTATION-GUIDE.md
- docs/POSTORA-API-INTEGRATION-GUIDE.md

**Flow:**
start local dev -> container launches PG 15.3 -> project expects PG 15.1 -> migration fails

**Timestamp:** 2026-06-21

**Author:** meowso

## Narrative
### Structure
Describes the issue where the Supabase local database container uses PostgreSQL 15.3 instead of the expected 15.1, resulting in migration errors when starting local development. Details the steps: launching the container, encountering migration error, and diagnosing the version mismatch.

### Dependencies
Depends on correct version alignment between docker-compose.yml and expected project schema migrations.

### Highlights
Mismatch between container DB version and migration scripts caused local development to fail until container version was corrected.

### Rules
Rule: Always align database container version in docker-compose.yml with project-required PostgreSQL version.

### Examples
Example docker-compose DB service: image: supabase/postgres:15.3. Example migration error: "database version mismatch: expected 15.3, got 16.3".
