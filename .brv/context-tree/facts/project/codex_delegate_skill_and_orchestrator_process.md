---
title: Codex Delegate Skill and Orchestrator Process
summary: Codex Delegate skill enables orchestrator-driven delegation to Codex CLI, enforcing commit separation, review gates, and process non-negotiables.
tags: []
related: [facts/project/codex_delegate_skill_and_orchestration_workflow.md, facts/project/codex_delegate_orchestration_and_usage_facts.md, facts/project/codex_delegate_skill_and_api_migration_verification_protocol.md, facts/project/codex_delegate_skill_and_postora_migration_verification_protocol.md, facts/project/codex_delegate_endpoint_hardening_and_phase_audit_2026_06_21.md, facts/project/postora_api_endpoint_and_routing_facts.md, facts/project/frontend_csp_patch_and_backend_500_audit_2026_06_21.md, facts/project/supabase_edge_function_deploy_and_credential_facts.md, facts/project/supabase_edge_runtime_per_function_config_preflight_incident_2026_06_21.md, facts/project/frontend_url_migration_2026_06_21.md, facts/project/supabase_db_container_pg_version_mismatch_incident_2026_06_21.md]
keywords: []
createdAt: '2026-06-22T06:17:24.449Z'
updatedAt: '2026-06-22T06:17:24.449Z'
---
## Reason
Document the Codex Delegate skill, orchestration workflow, and relevant project process as durable knowledge.

## Raw Concept
**Task:**
Document the Codex Delegate skill, orchestrator workflow, and rationale for orchestration-driven, review-first coding with Codex CLI.

**Changes:**
- Described the full orchestration and review workflow for Codex Delegate.
- Enumerated prerequisites and usage boundaries for safe delegation.
- Preserved the non-negotiable process and commit separation.

**Files:**
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md

**Flow:**
Write brief -> Dispatch to Codex CLI -> Wait for result.json -> Review changes and rerun gates -> Commit manually

**Timestamp:** 2026-06-22

**Author:** PI Agent

## Narrative
### Structure
Describes the orchestrator-driven delegation loop for bounded coding tasks: writing a brief, dispatching via relay script, reviewing Codex output, re-verifying with gates and guards, and landing changes only after manual review.

### Dependencies
Requires Codex CLI 0.141.0+ installed and authenticated, a valid git repo, and the relay helper script.

### Highlights
Codex CLI never commits directly; orchestrator re-verifies with test/lint/build gates and guard skills; delegation is strictly opt-in and bounded by explicit briefs.

### Rules
Non-negotiables: orchestrator must re-run all gates, only orchestrator commits, one task per brief per commit, scope expansions must pause for confirmation. Codex CLI sees only the brief, not repo or chat state.

### Examples
Use case: orchestrator writes a brief for a feature, dispatches via relay, reviews output, runs CleanCodeGuard and TestGuard, then commits only after all checks pass.

## Facts
- **Codex Delegate skill**: The Codex Delegate skill allows an orchestrator to hand a bounded coding task to a separate implementer (the OpenAI Codex CLI), review the output, and commit the changes themselves.
- **Codex Delegate workflow**: The orchestrator writes the brief, owns the judgment, and commits the verified work; Codex performs the implementation in its own sandbox.
- **Codex Delegate compatibility**: The Codex Delegate skill requires only the ability to run a shell command and read a file, making it compatible with various orchestrators such as Claude Code and OpenCode.
- **Codex Delegate orchestrator support**: The skill is designed for and run on Claude Code; other orchestrators are considered designed-for but not yet proven.
- **Codex Delegate usage guidelines**: The skill should not be used if the task is small enough to do inline, if the codex CLI is not installed or authenticated, or if the user wants to write the code themselves or only needs a review.
- **Codex Delegate prerequisites**: Prerequisites include: 'codex --version' must succeed, confirming which 'codex' is on PATH, and being in or pointing to the target git repository.
- **Codex Delegate workflow**: The workflow consists of five steps: write the brief, dispatch, wait for completion, review, and land the changes.
- **Codex context limitations**: Codex only sees the text sent in the brief; it has no repo memory, chat history, or shared context.
- **Codex Delegate brief requirements**: The orchestrator must specify the project's actual gate commands in the brief, discovered from the repo's CLAUDE.md, AGENTS.md, or Makefile.
- **Codex Delegate helper script**: The helper script wraps 'codex exec', captures the run, and writes a structured 'result.json'.
- **Codex Delegate helper script**: The helper defaults to a write-capable sandbox and writes artifacts to a temporary directory, keeping the repo under review clean.
- **Codex Delegate commit process**: The helper never commits changes; only the orchestrator does.
- **Codex Delegate completion criteria**: The helper blocks until Codex finishes, and the run is considered complete when 'result.json' exists with a status and the process has exited.
- **Codex Delegate error handling**: A missing 'codex' binary exits with code 127 but writes a 'result.json' with status 'codex_unavailable'.
- **Codex Delegate review process**: Codex's 'result.json' includes its own summary and gate claims, but the orchestrator must re-verify by re-running the project's gates and reviewing the diff.
- **Codex Delegate review process**: For schema or migration changes, round-trip them; for removals, grep for dangling references.
- **Codex Delegate commit process**: The orchestrator commits the verified work after the gates pass and the diff is confirmed.
- **Codex Delegate iterative process**: If changes are needed, the orchestrator sends a delta brief with '--resume-last' and reviews again.
- **Codex Delegate non-negotiables**: Non-negotiables include: re-running the gates, orchestrator commits (never Codex), one task per brief per commit, and trusting the working tree and process state over progress trackers.
- **Codex Delegate authorization model**: Delegation is something the human opts into, and committing verified, gate-passing work is the agreed contract.
- **Codex Delegate authorization model**: The orchestrator must surface, not absorb, Codex's design decisions and stop for scope changes.
- **Codex Delegate trust and safety**: The 'scripts/relay.mjs' script makes no network calls, reads or writes no credentials, sends no telemetry, has no dependencies except Node built-ins, and shells out only to 'codex' and 'git'.
- **Codex Delegate authentication**: The 'codex' process launched by the helper authenticates exactly as the user does at the terminal.
- **Codex Delegate package contents**: The 'scripts/relay.mjs' script is the only executable in the package; everything else is Markdown.
- **script process**: The process launched by the script does authenticate exactly as you do at the terminal.
- **package**: The script is the one executable in the package; everything else is Markdown.
- **skill**: The skill does not commit for you.
- **skill**: The skill does not review the code's quality itself.
- **skill**: The skill does not run your tests.
- **skill**: The skill is not the inverse direction (Codex reviewing your work).
- **openai-codex plugin**: For Codex reviewing your work, use the openai-codex plugin's review command or stop-review gate.
