---
title: codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21
summary: Codex Delegate orchestration, phase-audit workflow, and endpoint verification protocol for Postora API migration
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:16:47.897Z'
updatedAt: '2026-06-22T06:55:20.334Z'
---
## Reason
Document Codex Delegate orchestrator workflow, phase gating, and verification protocol for Postora API endpoint migration

## Raw Concept
**Task:**
Document Codex Delegate orchestrator workflow and endpoint verification protocol for Postora API migration (2026-06-21)

**Changes:**
- Set main API endpoint to https://api.postora.cloud
- Phase out legacy hosted Supabase URLs
- Add backup alias https://supabase.postora.cloud and rollback https://old.postora.cloud
- Strictly enforce read-only and non-destructive checks during migration verification
- Codex Delegate skill/process and verification protocol extracted from orchestrator conversation
- Captured phased API migration/verification checklist
- Preserved key facts about CLI prerequisites, trust boundaries, and commit protocol
- Adopted multi-phase, read-only verification workflow
- API endpoint and migration hardening via Codex Delegate skill
- Phase gating and review process enforced before any commit
- Old hosted Supabase purging from production endpoints

**Files:**
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md

**Flow:**
Orchestrator writes brief -> Codex CLI executes read-only -> Orchestrator reviews -> Guard skills run -> Commit if all gates pass

**Timestamp:** 2026-06-21

**Author:** orchestrator

## Narrative
### Structure
Codex Delegate workflow is strictly phase-separated: each API/DNS/endpoint migration phase is briefed, delegated to Codex CLI in a sandbox, and reviewed independently by the orchestrator. No unreviewed commits allowed.

### Dependencies
Requires Codex CLI 0.141.0+, CleanCodeGuard, TestGuard, and a git repository. Orchestrator must stop for scope changes and not expand Codex mandate without review.

### Highlights
API migration workflow is multi-phase, with all claims independently verified before any commit. All guard skills must pass before landing changes.

### Rules
Rule 1: Never delegate more than one phase per brief.
Rule 2: No file edits, deployments, or DNS changes during verification.
Rule 3: Always verify with guard skills before commit.
Rule 4: Orchestrator is the only committer.

### Examples
Example: For DNS migration, orchestrator writes phase brief, dispatches to Codex CLI, reviews result, runs gates/guards, and only then commits.

## Facts
- **codex_delegate_orchestration**: Codex Delegate orchestrator enforces phase separation and review discipline before any commit. [project]
- **verification_delegation**: All API endpoint and migration verification phases are delegated to Codex CLI, with orchestrator retaining commit authority. [project]
- **verification_restrictions**: No file edits, deployments, DNS, or environment changes are allowed during verification phase. [project]
- **codex_delegate_skill**: Codex CLI is only used for sandboxed delegation; orchestrator writes briefs, reviews, and lands changes. [project]
- **api_endpoints**: API endpoints: https://api.postora.cloud (canonical), https://old.postora.cloud, https://supabase.postora.cloud (rollback/backup). [project]
- **workflow_model**: Strict, multi-phase, read-only verification workflow: delegate each phase to Codex CLI, review, and only commit after all gates pass. [project]
- **phase_separation**: Codex Delegate workflow enforces strict phase separation and single-task-per-brief discipline before any commit. [project]
- **delegation_flow**: Codex Delegate workflow: orchestrator writes brief, delegates to Codex CLI, reviews output, independently runs gates/guards, repeats until verified. [project]
- **guard_skills**: Use guard skills (CleanCodeGuard, TestGuard) to verify outputs before committing any changes. [project]
- **api_url_migration**: Old hosted Supabase and legacy URLs must be purged from production; only canonical endpoint used. [project]
- **commit_model**: Codex runs in a sandbox, never commits directly; orchestrator reviews and commits only after all gates pass. [project]
- **codex_delegate_skill_path**: Codex Delegate skill at C:\Users\HP\.pi\agent\skills\codex-delegate. [project]
- **guard_skills_list**: Guard skills: CleanCodeGuard, TestGuard. [project]
