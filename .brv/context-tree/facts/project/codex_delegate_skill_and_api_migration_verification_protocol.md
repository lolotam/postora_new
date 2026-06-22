---
title: Codex Delegate Skill and API Migration Verification Protocol
summary: 'Codex Delegate orchestration: orchestrator writes brief, Codex CLI implements, orchestrator reviews and commits; detailed protocol for Postora API endpoint, DNS, frontend, OAuth, rollback verification.'
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:17:07.651Z'
updatedAt: '2026-06-22T06:17:07.651Z'
---
## Reason
Preserve durable knowledge of Codex Delegate orchestration pattern and the comprehensive API migration verification protocol for postora.cloud

## Raw Concept
**Task:**
Document the Codex Delegate orchestration workflow and the stepwise API migration verification protocol for postora.cloud

**Changes:**
- Established Codex Delegate protocol: brief, dispatch, review, commit
- Documented strict rules for API migration verification: read-only, no DNS/env/deploy changes
- Defined 6-phase protocol for endpoint, DNS, API paths, frontend, OAuth, rollback, and migration safety check

**Files:**
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md
- F:/Postora_new

**Flow:**
Codex Delegate: orchestrator writes brief -> Codex CLI executes task -> orchestrator verifies and commits; API migration: verify DNS/endpoint -> API paths -> frontend targets -> OAuth URLs -> rollback -> final verdict

**Timestamp:** 2026-06-22

**Author:** pi orchestrator

**Patterns:**
- `^https://api\.postora\.cloud` - Valid API endpoint pattern for Postora
- `^https://supabase\.postora\.cloud` - Valid backup alias for Postora
- `^https://old\.postora\.cloud` - Valid rollback alias for Postora

## Narrative
### Structure
Codex Delegate skill enables orchestrated delegation of bounded coding tasks to Codex CLI, with orchestrator writing the brief, reviewing output, rerunning all gates, and landing verified changes. The protocol includes strict non-editing rules and a phase-based checklist for verifying API migration including DNS, endpoint, API paths, frontend runtime, OAuth flows, and rollback readiness.

### Dependencies
Requires Codex CLI 0.141.0+, relay helper, valid git repo, Playwright for browser phases. No browser or deployment access within Codex CLI sandbox.

### Highlights
Enforced orchestrator verification, read-only guarantee, multi-phase protocol covering all API and frontend migration safety aspects, strict separation of duties (Codex never commits, orchestrator must re-run gates).

### Rules
Rule 1: Orchestrator must re-run all gates and verify diffs before commit
Rule 2: Codex must not commit code directly
Rule 3: No modifications to DNS, Dokploy, env, deploy, or secrets during verification
Rule 4: One task = one brief = one commit
Rule 5: Surface all Codex design decisions and scope changes for review

### Examples
Phase 1: Check api.postora.cloud, supabase.postora.cloud, postora.cloud, old.postora.cloud for status and cert
Phase 2: Test all API paths for correct response (auth/rest/storage/functions)
Phase 3: Verify frontend (postora.cloud) uses only api.postora.cloud for Supabase
Phase 4: Check OAuth URLs point to api.postora.cloud/functions/v1/*
Phase 5: Confirm rollback app (old.postora.cloud) and old Supabase cloud linkage
Phase 6: Issue final verdict on endpoint health, migration blockers, and safe-to-continue verdict

## Facts
- **Codex Delegate skill**: The Codex Delegate skill allows an orchestrator to hand a bounded coding task to a separate implementer (the OpenAI Codex CLI), review the output, and commit the changes themselves. [project]
- **Codex Delegate workflow**: The orchestrator writes the brief, owns the judgment, and verifies and commits the work; Codex does the typing in its own sandbox. [project]
- **Codex Delegate compatibility**: The Codex Delegate loop requires only the ability to run a shell command and read a file, making it compatible with various orchestrators such as Claude Code and OpenCode. [project]
- **Codex Delegate orchestrator support**: The skill is designed for and run on Claude Code; other orchestrators are considered designed-for but not yet proven. [project]
- **Codex Delegate usage guidelines**: The Codex Delegate skill should not be used if the task is small enough to do inline, if the codex CLI is not installed or authenticated, or if the user wants to write the code themselves or only needs a review. [project]
- **Codex Delegate prerequisites**: Prerequisites for using the skill include: 'codex --version' must succeed, confirming which 'codex' is on PATH, and being in or pointing '--cd' at the target git repository. [project]
- **Codex Delegate workflow**: The Codex Delegate workflow consists of five steps per task: write the brief, dispatch, wait for completion, review, and land the changes. [project]
- **Codex context limitations**: Codex only sees the text sent in the brief; it has no repo memory, chat history, or shared context. [project]
- **Codex Delegate brief requirements**: The orchestrator must specify the project's actual gate commands in the brief, discovered from the repo's CLAUDE.md, AGENTS.md, or Makefile. [project]
- **Codex Delegate helper script**: The helper script wraps 'codex exec', captures the run, and writes a structured 'result.json'. [project]
- **Codex Delegate helper script**: The helper defaults to a write-capable sandbox and writes artifacts to a temporary directory, keeping the repo under review clean. [project]
- **Codex Delegate commit responsibility**: The helper never commits changes; the orchestrator is responsible for committing. [project]
- **Codex Delegate completion criteria**: The helper blocks until Codex finishes, and the run is considered finished when 'result.json' is written and the process has exited. [project]
- **Codex Delegate error handling**: A missing 'codex' binary exits with code 127 but writes a 'result.json' with status 'codex_unavailable'. [project]
- **Codex Delegate review process**: Codex's 'result.json' includes its own summary and gate claims, but the orchestrator must re-verify and not accept them at face value. [project]
- **Codex Delegate review process**: The orchestrator must re-run the project's gates themselves and read the diff against the brief to ensure Codex did what was asked. [project]
- **Codex Delegate review process**: For schema or migration changes, round-trip them; for removals, grep for dangling references. [project]
- **Codex Delegate commit process**: The orchestrator commits the verified work themselves, with a clear message, only after the gates pass and the diff holds. [project]
- **Codex Delegate iterative process**: If changes are needed, the orchestrator sends a delta brief with '--resume-last' and reviews again. [project]
- **Codex Delegate task management**: One task should correspond to one brief and one commit; unrelated work should be split into separate runs. [project]
- **Codex Delegate authorization model**: Delegation is something the human opts into, and committing verified, gate-passing work is the agreed contract. [project]
- **Codex Delegate review guidelines**: The orchestrator should surface, not absorb, Codex's design decisions, defensible-but-unasked turns, and non-blocking nitpicks. [project]
- **Codex Delegate scope management**: If correct completion requires going beyond the brief, the orchestrator should stop and ask rather than expand the mandate themselves. [project]
- **Codex Delegate trust and safety**: The 'scripts/relay.mjs' script makes no network calls, reads or writes no credentials, sends no telemetry, has no dependencies beyond Node built-ins, and shells out only to 'codex' and 'git'. [project]
- **Codex Delegate authentication**: The 'codex' process launched by the helper authenticates exactly as the user does at the terminal. [project]
- **Codex Delegate package contents**: The 'scripts/relay.mjs' script is the only executable in the package; everything else is Markdown. [project]
- **script process**: The process launched by the script does authenticate exactly as you do at the terminal. [other]
- **package**: The script is the one executable in the package; everything else is Markdown. [other]
- **skill**: The skill does not commit for you. [other]
- **skill**: The skill does not review the code's quality itself. [other]
- **skill**: The skill does not run your tests. [other]
- **skill**: The skill is not the inverse direction (Codex reviewing your work). [other]
- **API endpoint**: The desired API endpoint is https://api.postora.cloud. [other]
- **API paths**: The desired API paths are https://api.postora.cloud/auth/v1/, https://api.postora.cloud/rest/v1/, https://api.postora.cloud/storage/v1/, https://api.postora.cloud/functions/v1/get-public-config, https://api.postora.cloud/functions/v1/facebook-oauth, and https://api.postora.cloud/functions/v1/instagram-oauth. [other]
- **frontend**: The desired frontend is https://postora.cloud. [other]
- **rollback**: The desired rollback is https://old.postora.cloud. [other]
- **backup alias**: The backup alias is https://supabase.postora.cloud. [other]
- **Dokploy Kong domain**: User screenshot showed a Dokploy Kong domain named only 'api'. [other]
- **project**: Strict rules include: read-only only, do not edit Dokploy, do not edit DNS, do not edit env, do not deploy, do not restart containers, do not print secrets. [other]
- **Phase 1**: Phase 1 involves checking https://api.postora.cloud, https://supabase.postora.cloud, https://postora.cloud, and https://old.postora.cloud for HTTP status, certificate validity, and apparent service identity. [other]
- **Phase 2**: Phase 2 involves testing read-only access to API paths and verifying expected responses. [other]
- **Phase 3**: Phase 3 involves opening https://postora.cloud and inspecting browser network calls to confirm all Supabase calls use https://api.postora.cloud. [other]
- **Phase 4**: Phase 4 involves inspecting generated OAuth/connect URLs or source constants to verify OAuth links use https://api.postora.cloud/functions/v1/ endpoints. [other]
- **Phase 5**: Phase 5 involves opening https://old.postora.cloud to confirm it serves the old frontend and is available as rollback. [other]
- **Phase 6**: Phase 6 involves reporting on the main API endpoint, frontend usage, removal of old hosted Supabase, backup alias health, rollback health, blockers, fix requests, and migration safety. [other]
- **Codex CLI**: Codex CLI 0.141.0 is available and the relay helper exists. [project]
- **Codex CLI**: Codex CLI 0.141.0 is installed and the relay helper works. [project]
- **F:/Postora_new**: The repo at F:/Postora_new is a valid git repo. [other]
- **Codex**: Codex has no browser, so browser-inspection phases (3 and 5) cannot be done by Codex. [project]
- **browser-inspection**: Browser-inspection phases will be run directly with Playwright. [other]
- **delegation**: Curl/DNS phase (1), API-path phase (2), and source-reading phase (4) will be delegated to Codex. [other]
- **Phase 1**: Phase 1 is running in the background (PID 3090). [other]
- **Codex**: Codex works on DNS/HTTP. [project]
- **Phase 3**: Phase 3 is started with Playwright (browser inspection — which Codex cannot do). [other]
