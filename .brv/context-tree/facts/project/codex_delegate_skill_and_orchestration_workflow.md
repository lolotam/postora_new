---
title: codex_delegate_skill_and_orchestration_workflow
summary: 'Codex Delegate skill and workflow: bounded code delegation, orchestrator/implementer split, phase review, commit policy, and orchestration rules.'
tags: []
related: [facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:42:07.452Z'
updatedAt: '2026-06-22T08:05:54.545Z'
---
## Reason
Preserve Codex Delegate skill, workflow, and orchestration process as durable project knowledge

## Raw Concept
**Task:**
Document the Codex Delegate skill, its orchestration workflow, commit and review process, prerequisites, and constraints.

**Changes:**
- Codex Delegate skill: orchestrator-implementer workflow, commit responsibility, trust/safety, review and land process, system requirements, and non-negotiables documented.
- Codex Delegate workflow established as phase-driven, verification-centric process
- Explicit prevention of direct commits, DNS, and environment changes during verification
- Enforced use of guard skills and review before landing changes
- Defined orchestration, review, and commit boundaries.
- Outlined prerequisites for Codex Delegate use.
- Documented strict read-only deployment verification workflow.
- Codex Delegate skill formalized for orchestrator/implementer split
- Phase-based workflow and commit policy established
- Strict separation of review, commit, and implementation roles
- Codex CLI and orchestrator compatibility rules specified
- Limits and non-goals of delegation skill clarified
- Read-only verification protocol and deployment constraints codified

**Files:**
- C://Users//HP//.pi//agent//skills//codex-delegate//SKILL.md
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md

**Flow:**
orchestrator writes brief -> Codex CLI runs in sandbox -> helper script relays -> orchestrator reviews/checks gates -> orchestrator commits or pauses

**Timestamp:** 2026-06-22

**Author:** pi agent

## Narrative
### Structure
Codex Delegate skill formalizes code task delegation as an orchestrator/implementer split. The orchestrator writes a self-contained brief, Codex CLI executes in a sandboxed repo, and the orchestrator reviews, re-runs gates, and commits only verified outputs. The workflow is phase-based: brief, dispatch, wait, review (do not trust self-report), and land (commit boundary is enforced). Skill is compatible with any orchestrator that can run shell commands and read files. Strict rules: no commit by Codex, no silent absorption of scope creep, each run is one brief and one commit, do not run or deploy in read-only verification, surface all design turns. Deployment and verification tasks are phase-separated and tracked. Read-only verification protocol requires no edits, no deploys, no container restarts, and no DNS/env changes. Prerequisites include Codex CLI setup, repo context, and clear role/task boundaries.

### Dependencies
Requires working Codex CLI install, orchestrator agent capable of running shell commands, repo context, and access to brief and verification scripts.

### Highlights
Codex CLI is used for bounded code generation; orchestrator acts as reviewer and committer. Strong guardrails prevent unreviewed auto-commits. Read-only verification is not a valid use case for code delegation; must be handled by orchestrator directly.

### Rules
Rule 1: Codex never commits, only orchestrator does.
Rule 2: All project gates/tests must be re-run by orchestrator.
Rule 3: One task = one brief = one commit.
Rule 4: Do not expand scope without explicit request.
Rule 5: Read-only verification has no commit boundary and must not use Codex for remote/infra checks.
Rule 6: No file edits, deploys, container restarts, nor DNS/env/DB changes in verification phase.
Rule 7: Always surface non-blocking design turns and report scope mismatches.
Rule 8: Use guard skills for review only if code changes beyond push/deploy.

### Examples
Example: Delegate a push to Codex for phase 1, review with CleanCodeGuard and TestGuard, and commit only after all verification gates pass. Example: For read-only deployment verification, orchestrator must handle all checks without Codex.

## Facts
- **Codex Delegate skill**: The Codex Delegate skill allows an orchestrator to delegate a bounded coding task to an implementer (the OpenAI Codex CLI), review the output, and commit the changes themselves.
- **Codex Delegate workflow**: The orchestrator writes the brief, Codex executes the task in its own sandbox, and the orchestrator verifies and commits the result.
- **Codex Delegate compatibility**: The Codex Delegate skill is designed for Claude Code but can work with any orchestrator that can run shell commands and read files.
- **Codex Delegate usage**: The skill should not be used if the task is small enough to do inline, if the codex CLI is not installed or authenticated, or if the user wants to write the code themselves or only needs a review.
- **Codex Delegate prerequisites**: Prerequisites for using the skill include: 'codex --version' must succeed, confirming which 'codex' is on PATH, and being in or pointing to the target git repository.
- **Codex Delegate workflow**: The workflow consists of five steps: write the brief, dispatch, wait for completion, review, and land the changes.
- **Codex context**: Codex only sees the text sent in the brief; it has no repo memory, chat history, or shared context.
- **Codex Delegate brief**: The orchestrator must specify the project's actual gate commands in the brief, discovered from the repo's CLAUDE.md, AGENTS.md, or Makefile.
- **Codex Delegate helper script**: The helper script wraps 'codex exec', captures the run, and writes a structured 'result.json'.
- **Codex Delegate helper script**: The helper defaults to a write-capable sandbox and writes artifacts to a temporary directory, keeping the repo under review clean.
- **Codex Delegate commit process**: The orchestrator, not Codex, is responsible for committing the verified work after all gates pass and the diff is reviewed.
- **Codex sandbox limitations**: Codex's sandbox cannot reliably write to .git due to variations in version, OS, and path.
- **Codex Delegate review process**: The orchestrator must re-run the project's gates themselves and not trust Codex's self-report.
- **Codex Delegate workflow**: One task should correspond to one brief and one commit; unrelated work should be split into separate runs.
- **Codex Delegate authorization**: Delegation is something the human opts into, and committing verified, gate-passing work is the agreed contract.
- **Codex Delegate review**: The orchestrator should surface, not absorb, Codex's design decisions, defensible-but-unasked turns, and non-blocking nitpicks.
- **Codex Delegate scope management**: If correct completion requires going beyond the brief, the orchestrator should stop and ask rather than expand the mandate themselves.
- **relay.mjs script**: The 'scripts/relay.mjs' script makes no network calls, reads or writes no credentials, sends no telemetry, has no dependencies beyond Node built-ins, and shells out only to 'codex' and 'git'.
- **codex authentication**: The 'codex' process launched by the helper script authenticates in the same way as a user at the terminal.
- **Codex Delegate package contents**: The only executable in the package is 'scripts/relay.mjs'; everything else is Markdown.
- **script process**: The process launched by the script does authenticate exactly as you do at the terminal.
- **package**: The script is the one executable in this package; everything else is Markdown.
- **skill**: The skill does not commit for you.
- **skill**: The skill does not review the code's quality itself.
- **skill**: The skill does not run your tests.
- **skill**: The skill is not the inverse direction (Codex reviewing your work).
- **openai-codex plugin**: For Codex reviewing your work, use the openai-codex plugin's review command or stop-review gate.
- **OpenCode**: OpenCode should push ce0f495b and a916ac7a.
- **frontend**: Frontend should be rebuilt/redeployed so postora.cloud uses api.postora.cloud and old preconnects are gone.
- **Batch 1A**: Batch 1A should deploy only manage-oauth-redirects and manage-cron-jobs if both passed preflight.
- **deployment**: No webhooks/OAuth provider callbacks/Stripe/AI/media functions should be deployed.
- **api.postora.cloud**: api.postora.cloud is the main API endpoint.
- **supabase.postora.cloud**: supabase.postora.cloud is a backup alias.
- **old.postora.cloud**: old.postora.cloud is rollback old app.
- **process**: Strict rules: Read-only only. Do not edit files. Do not deploy. Do not restart containers. Do not print secrets.
- **Codex**: Codex running on this local Windows box (F:\Postora_new) has no SSH keys, no Dokploy MCP, no Supabase MCP, no Playwright.
- **Codex**: Codex can check local git and curl public URLs but cannot reach the remote servers where the functions volume and logs actually live.
- **remote servers**: Remote servers are only reachable through the tools held by the user (ssh_contabo_mcp, ssh_Noor_mcp, dokploy_contaboo_mcp, supabase_postora_mcp, Playwright, ctx_batch_execute).
- **read-only verification**: There is nothing to commit in read-only verification.
- **read-only verification**: Read-only verification has no commit boundary.
- **Codex**: No edits, deploys, container restarts, DNS, environment, or database changes will be made to Codex.
- **Phase 1**: Tracking will be set up and Phase 1 will be started.
- **Phase 1**: Phase 1 is being marked as in progress and the git state is being grounded.
