---
title: codex_delegate_skill_and_postora_migration_verification_protocol
summary: Codex Delegate orchestrator workflow and strict, multi-phase, read-only Postora API migration verification protocol with phase discipline, re-verification, and guard skills.
tags: []
related: [facts/project/codex_delegate_rlm_skill_and_migration_plan_process.md, facts/project/frontend_url_migration_2026_06_21.md, docs/postora-api-integration-guide.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:10:51.753Z'
updatedAt: '2026-06-22T06:55:34.140Z'
---
## Reason
Document Codex Delegate orchestrator workflow and Postora API multi-phase verification protocol

## Raw Concept
**Task:**
Document the Codex Delegate orchestrator workflow and the Postora API multi-phase migration verification protocol, including phase discipline, guard skills, and strict review process.

**Changes:**
- Curated Codex Delegate skill protocol and phase verification checklists from RLM context
- Documented migration endpoints, verification rules, and orchestrator roles
- Established orchestration protocol: orchestrator writes brief, Codex CLI implements, orchestrator reviews and commits
- Frontend API endpoint migration: update from supabase.postora.cloud to api.postora.cloud
- API verification protocol split into 6 phases (domain/DNS, API-path, frontend runtime, OAuth URL, rollback, final verdict)
- Established six-phase, read-only verification protocol for API migration
- Enforced strict separation of commit and execution (orchestrator commits, Codex does not)
- Required independent re-verification of every Codex claim by orchestrator
- Mandated phase-by-phase task discipline for API migration gate checks
- Clarified strict rules prohibiting edits, deploys, or DNS changes during verification phase

**Files:**
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md
- docs/POSTORA-API-INTEGRATION-GUIDE.md
- docs/OAUTH-TOKEN-REFRESH-GUIDE.md

**Flow:**
Brief writing -> Codex CLI dispatch via relay script -> read-only sandbox execution -> result.json review -> independent re-verification and gate checks -> orchestrator commit

**Timestamp:** 2026-06-22

**Author:** assistant

## Narrative
### Structure
PI agent orchestrates a strict, phase-based API migration verification using Codex Delegate. Each phase is dispatched as a discrete brief to Codex, which executes in a sandbox and reports results via result.json. Orchestrator independently checks all Codex claims, runs CleanCodeGuard and TestGuard skills, and only commits after all gates pass. No edits, deploys, or DNS changes are allowed during verification.

### Dependencies
Requires Codex CLI 0.141.0+, relay.mjs script, CleanCodeGuard and TestGuard skills for review, and access to target git repo.

### Highlights
Six-phase protocol covers DNS, API paths, frontend runtime, OAuth URLs, rollback, and final verdict. Orchestrator owns all commit decisions and must halt for scope changes.

### Rules
Rule 1: Orchestrator writes briefs, Codex executes, orchestrator reviews and commits.
Rule 2: No file edits, deploys, DNS, or environment changes during verification.
Rule 3: Orchestrator must independently verify all Codex claims and run all gates before committing.

### Examples
Example: Phase 1 — Check api.postora.cloud DNS and certificate, report HTTP status and risk; Phase 2 — Verify /auth/v1/ path is reachable and returns expected status.

## Facts
- **codex_delegate_skill**: Codex Delegate skill is used for orchestrating bounded coding tasks via the Codex CLI, with the orchestrator writing the brief and owning the judgment. [project]
- **codex_delegate_workflow**: The orchestrator writes the brief, dispatches to Codex in a sandbox, reviews the result, runs gates/guards, and only lands changes after all gates pass. [project]
- **codex_delegate_compatibility**: Codex Delegate is compatible with Claude Code and OpenCode orchestrators. [project]
- **codex_prerequisites**: Codex CLI must be installed and authenticated; correct version and path must be confirmed before delegation. [project]
- **codex_delegate_commit_process**: The orchestrator (not Codex) commits work after independent review and gate checks. [project]
- **scripts_relay_usage**: scripts/relay.mjs is used to dispatch briefs to Codex, writing artifacts to a temp directory and never committing directly. [project]
- **codex_process_authentication**: Codex process authenticates using the same credentials as the user; relay script has no network or credential access. [project]
- **codex_delegate_authorization**: Codex Delegate enforces strict phase separation: one task per brief, one commit per phase. [project]
- **postora_api_verification_phases**: PI agent tasks for Postora API migration use a strict, six-phase read-only verification protocol. [project]
- **api_endpoint**: Main API endpoint must be https://api.postora.cloud; desired API paths include /auth/v1/, /rest/v1/, /storage/v1/, /functions/v1/get-public-config. [project]
- **frontend_and_rollback**: The frontend must use https://api.postora.cloud as its API target; https://old.postora.cloud is reserved for rollback. [project]
- **backup_alias**: Backup alias https://supabase.postora.cloud is for internal or fallback use only. [project]
- **kong_domain_and_supabase_removal**: Dokploy Kong domain must be set to api.postora.cloud; old hosted Supabase domain must be fully removed. [project]
- **strict_rules**: Strict rules for verification: read-only only, no edits to Dokploy, DNS, env, no deploys, no secret prints. [project]
- **verification_phases**: Each verification phase (domain/DNS check, API path verification, frontend runtime check, OAuth URL check, rollback check, final verdict) has explicit pass/fail and reporting requirements. [project]
- **verification_discipline**: All phases must be completed before any migration or commit proceeds; orchestrator must stop for scope changes. [project]
- **reverification_discipline**: Codex self-report is never sufficient; orchestrator must independently re-verify all claims and re-run gates. [project]
