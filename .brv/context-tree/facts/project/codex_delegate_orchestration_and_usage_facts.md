---
title: Codex Delegate Orchestration and Usage Facts
summary: 'Codex Delegate orchestration: workflow, requirements, review/commit loop, boundaries, and deployment verification constraints.'
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_skill_and_orchestrator_process.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T08:03:50.584Z'
updatedAt: '2026-06-22T08:03:50.584Z'
---
## Reason
Preserve durable facts, workflow, and constraints of Codex Delegate orchestration model and deployment phases from RLM extraction.

## Raw Concept
**Task:**
Document the Codex Delegate orchestration workflow, requirements, constraints, and deployment verification protocol.

**Changes:**
- Summarized the end-to-end orchestration loop (brief, dispatch, review, commit).
- Captured all deployment and review phase boundaries, strict no-commit/no-deploy guardrails, and scope management.
- Documented the prerequisites, non-negotiables, and error-handling patterns.

**Files:**
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md

**Flow:**
Write brief → Dispatch to Codex → Codex runs in sandbox → Review and validate gates → Commit if gates pass → Repeat for changes.

**Timestamp:** 2026-06-22

## Narrative
### Structure
Codex Delegate is an orchestrator-driven loop for bounded code tasks: write a detailed brief, delegate to Codex CLI, review structured results, apply guard skills, commit only after successful gates, and repeat for each phase.

### Dependencies
Requires working codex CLI, orchestrator with shell and file access, and optionally guard skills for review. Relies on the correct git repository context and sandbox isolation for Codex.

### Highlights
Strictly separates implementation (Codex) and commit/review (orchestrator). Enforces no-commit/no-deploy boundaries for verification phases. Documents all deployment, review, and rollback endpoints for Postora.

### Rules
Rule 1: Orchestrator is solely responsible for committing; Codex never commits.
Rule 2: All gates must be re-run and validated by orchestrator.
Rule 3: Each brief is a single task/commit; no batching.
Rule 4: Never absorb scope changes silently — always surface them.
Rule 5: No deployment, file edits, or container changes during verification phase.
Rule 6: Remote infra checks require agent-held tools, not Codex CLI.

### Examples
Example: Batch 1A deployment only includes manage-oauth-redirects and manage-cron-jobs if preflight passes and omits all webhooks and media functions. Example: Codex CLI lacks access to remote function logs and volumes.

## Facts
- **Codex Delegate skill**: The Codex Delegate skill allows an orchestrator to hand a bounded coding task to a separate implementer (the OpenAI Codex CLI), review the output, and commit the changes themselves.
- **Codex Delegate workflow**: The orchestrator writes the brief, Codex does the typing in its own sandbox, and the orchestrator verifies and commits the changes.
- **Codex Delegate compatibility**: The loop requires only the ability to run a shell command and read a file, making it compatible with Claude Code, OpenCode with a selected model, or any comparable agent.
- **Codex Delegate design**: The skill is designed for and run on Claude Code; other orchestrators are considered designed-for but not yet proven.
- **When not to use Codex Delegate**: The Codex Delegate skill should not be used if the task is small enough to do inline, if the codex CLI is not installed or authenticated, or if the user wants to write the code themselves or only needs a review.
- **Codex Delegate prerequisites**: Prerequisites include: 'codex --version' must succeed, confirming which 'codex' is on PATH, and being in or pointing '--cd' at the target git repository.
- **Brief requirements**: The orchestrator must write a complete brief for Codex, including the goal, current state, changes, untouched areas, actual gate commands, and a report contract.
- **Codex context limitations**: Codex only sees the text sent in the brief; it has no repo memory, chat history, or shared context.
- **Helper script function**: The helper script wraps 'codex exec', captures the run, and writes a structured 'result.json'.
- **Helper script behavior**: The helper defaults to a write-capable sandbox and writes artifacts to a temp directory, keeping the repo under review clean.
- **Commit responsibility**: Codex never commits changes; the orchestrator is responsible for committing verified work.
- **Completion criteria**: The helper blocks until Codex finishes, and the run is considered finished when 'result.json' is written and the process has exited.
- **Error handling**: A missing 'codex' binary exits with code 127 but writes a 'result.json' with status 'codex_unavailable'.
- **Review process**: The orchestrator must re-verify Codex's results by re-running the project's gates and reading the diff against the brief.
- **Guard skills usage**: Guard skills (such as clean-code-guard, test-guard) can be run on the diff if installed.
- **Review checklist**: For schema/migration changes, round-trip them; for removals, grep for dangling references.
- **Commit process**: The orchestrator commits the verified work after the gates pass and the diff is correct.
- **Handling changes**: If changes are needed, a delta brief is sent with '--resume-last', and the review is repeated.
- **Non-negotiables**: Non-negotiables include: re-running gates, orchestrator commits (never Codex), one task per brief per commit, and trusting the working tree and process state over progress trackers.
- **Delegation model**: Delegation is opt-in by the human; committing verified, gate-passing work is the agreed contract.
- **Reporting and scope management**: The orchestrator must surface, not absorb, Codex's design decisions and stop for scope changes.
- **Security and dependencies**: The 'scripts/relay.mjs' script makes no network calls, reads or writes no credentials, sends no telemetry, has no dependencies except Node built-ins, and shells out only to 'codex' and 'git'.
- **Authentication**: The 'codex' process launched by the script authenticates as the user does at the terminal.
- **Package contents**: 'scripts/relay.mjs' is the only executable in the package; everything else is Markdown.
- **script process**: The script process it launches does authenticate exactly as you do at the terminal.
- **package**: It is the one executable in this package; everything else is Markdown.
- **skill**: The skill does not commit for you.
- **skill**: The skill does not review the code's quality itself.
- **skill**: The skill does not run your tests.
- **skill**: The skill is not the inverse direction (Codex reviewing your work).
- **openai-codex plugin**: For Codex reviewing your work, use the openai-codex plugin's review command or stop-review gate.
- **deployment**: Delegate this phase by phase to Codex.
- **review**: When Codex finishes the phases, review the code and use CleanCodeGuard and TestGuard skills.
- **process**: Do not modify files.
- **process**: Do not deploy.
- **process**: Do not restart containers.
- **process**: Do not change DNS/env/DB/Kong/cron/Docker/provider dashboards.
- **OpenCode**: OpenCode should push ce0f495b and a916ac7a.
- **frontend**: Frontend should be rebuilt/redeployed so postora.cloud uses api.postora.cloud and old preconnects are gone.
- **Batch 1A**: Batch 1A should deploy only manage-oauth-redirects and manage-cron-jobs if both passed preflight.
- **deployment**: No webhooks/OAuth provider callbacks/Stripe/AI/media functions should be deployed.
- **api.postora.cloud**: api.postora.cloud is main API endpoint.
- **supabase.postora.cloud**: supabase.postora.cloud is backup alias.
- **old.postora.cloud**: old.postora.cloud is rollback old app.
- **process**: Strict rules: Read-only only. Do not edit files. Do not deploy. Do not restart containers. Do not print secrets.
- **Codex**: Codex running on this local Windows box (F:\Postora_new) has no SSH keys, no Dokploy MCP, no Supabase MCP, no Playwright.
- **Codex**: Codex can check local git and curl public URLs but cannot reach the remote servers where the functions volume and logs actually live.
- **remote servers**: Remote servers are only reachable through the tools held by the user (ssh_contabo_mcp, ssh_Noor_mcp, dokploy_contaboo_mcp, supabase_postora_mcp, Playwright, ctx_batch_execute).
- **read-only verification**: There is nothing to commit — read-only verification has no commit boundary.
- **skill's authorization model**: The skill's authorization model advises to avoid 'absorb quietly' failures and instead to 'surface, don't absorb' and 'stop for scope changes'.
