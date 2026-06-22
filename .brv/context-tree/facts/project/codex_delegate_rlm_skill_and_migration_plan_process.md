---
title: Codex Delegate RLM Skill and Migration Plan Process
summary: Codex Delegate orchestrator-driven workflow, rules, and phased migration mapping for Supabase and frontend migration.
tags: []
related: []
keywords: []
createdAt: '2026-06-21T21:51:39.423Z'
updatedAt: '2026-06-21T21:51:39.423Z'
---
## Reason
Document Codex Delegate orchestrator workflow and remaining migration mapping process as a durable project fact for future reference.

## Raw Concept
**Task:**
Document the Codex Delegate orchestrator workflow, rules, and the remaining migration mapping process for Supabase and frontend migration

**Changes:**
- Established orchestrator-driven phased workflow for migration
- Documented strict audit, commit, and review rules
- Mapped out remaining migration tasks by phase, including function, secret, cron, OAuth, and cutover mapping
- Embedded ground-truth live state into each migration brief
- Clarified non-negotiables for delegation, review, and commit boundaries

**Files:**
- C:/Users/HP/.pi/agent/skills/codex-delegate/SKILL.md

**Flow:**
Write phase brief -> Dispatch to Codex CLI -> Poll for result -> Independently review gates and diff -> Commit only after all checks pass -> Repeat for all migration phases

**Timestamp:** 2026-06-21

**Author:** PI Agent & Assistant

## Narrative
### Structure
Codex Delegate skill enables orchestrator-driven, phase-based migration and code review. Each phase is briefed and dispatched independently, with the orchestrator responsible for all review and commits. Migration mapping is split into functional, secret, cron, OAuth, and cutover phases. Strict rules and non-negotiables govern auditability, commit ownership, and environment safety.

### Dependencies
Requires Codex CLI (npm i -g @openai/codex), skill references, and clean code/test guard skills for review. Relies on up-to-date live state from Supabase and frontend environments.

### Highlights
Phased migration mapping: function inventory, frontend edge dependencies, secret mapping, cron audit, OAuth/well-known audit, and final cutover plan. Only 5/107 functions deployed; cron jobs empty; frontend and DB migrated; strict read-only and secret-handling rules enforced.

### Rules
Rule 1: Orchestrator writes and dispatches phase brief; Codex never commits.
Rule 2: Commit only after all gates (build, lint, test) are rerun and pass.
Rule 3: Review Codex output independently; never trust self-report.
Rule 4: Read-only analysis only; never deploy or modify files during migration mapping.
Rule 5: Never print or copy secret values; report missing secret names only.
Rule 6: One task = one brief = one commit; split unrelated work.

### Examples
Example: Phase 1 maps deployed vs repo functions and classifies missing ones; Phase 3 builds secret requirement map for top-10 functions; Phase 6 outputs a prioritized migration batch plan.

## Facts
- **Codex Delegate skill**: The Codex Delegate skill allows an orchestrator to hand a bounded coding task to a separate implementer (the OpenAI Codex CLI), review the output, and commit the changes themselves.
- **Codex Delegate workflow**: The orchestrator writes the brief, owns the judgment, and verifies and commits the work; Codex does the typing in its own sandbox.
- **Codex Delegate compatibility**: The Codex Delegate loop requires only the ability to run a shell command and read a file, making it compatible with various orchestrators such as Claude Code and OpenCode.
- **Codex Delegate orchestrator support**: The skill is designed for and run on Claude Code; other orchestrators are considered designed-for but not yet proven.
- **Codex Delegate usage**: The Codex Delegate skill should not be used if the task is small enough to do inline, if the codex CLI is not installed or authenticated, or if the user wants to write the code themselves or only needs a review.
- **Codex Delegate prerequisites**: Prerequisites for using the skill include: 'codex --version' must succeed, confirming which 'codex' is on PATH, and being in or pointing '--cd' at the target git repository.
- **Codex Delegate workflow**: The Codex Delegate workflow consists of five steps per task: write the brief, dispatch, wait for completion, review, and land the changes.
- **Codex input limitations**: Codex only sees the text sent in the brief; it has no repo memory, chat history, or shared context.
- **Codex Delegate brief requirements**: The orchestrator must specify the project's actual gate commands in the brief, discovered from the repo's CLAUDE.md, AGENTS.md, or Makefile.
- **Codex Delegate helper script**: The helper script wraps 'codex exec', captures the run, and writes a structured 'result.json'.
- **Codex Delegate helper script**: The helper defaults to a write-capable sandbox and writes artifacts to a temporary directory, keeping the repo under review clean.
- **Codex Delegate commit responsibility**: Codex never commits changes; the orchestrator is responsible for committing verified work.
- **Codex Delegate completion criteria**: The helper blocks until Codex finishes, and the run is considered done when 'result.json' exists with a status and the process has exited.
- **Codex Delegate error handling**: A missing 'codex' binary exits with code 127 but writes a 'result.json' with status 'codex_unavailable'.
- **Codex Delegate review process**: Codex's 'result.json' includes its own summary and gate claims, but the orchestrator must re-verify by re-running the project's gates and reviewing the diff.
- **Codex Delegate review process**: For schema or migration changes, round-trip them; for removals, grep for dangling references.
- **Codex Delegate commit process**: The orchestrator commits the verified work themselves, with a clear message, only after the gates pass and the diff holds.
- **Codex Delegate iterative process**: If changes are needed, the orchestrator sends a delta brief with '--resume-last' and reviews again.
- **Codex Delegate non-negotiables**: Non-negotiables include: re-running the gates, the orchestrator commits (never Codex), one task per brief per commit, and trusting the working tree and process state over progress trackers.
- **Codex Delegate authorization model**: Delegation is something the human opts into, and committing verified, gate-passing work is the agreed contract.
- **Codex Delegate authorization model**: The orchestrator must surface, not absorb, Codex's design decisions, defensible-but-unasked turns, and non-blocking nitpicks, and must stop for scope changes.
- **Codex Delegate trust and safety**: 'scripts/relay.mjs' makes no network calls, reads or writes no credentials, sends no telemetry, has no dependencies except Node built-ins, and shells out only to 'codex' and 'git'.
- **Codex Delegate authentication**: The 'codex' process launched by the helper authenticates exactly as the user does at the terminal.
- **Codex Delegate package contents**: 'scripts/relay.mjs' is the only executable in the package; everything else is Markdown.
- **script process**: The process launched by the script does authenticate exactly as you do at the terminal.
- **package**: The script is the one executable in this package; everything else is Markdown.
- **skill**: The skill does not commit for you; that is deliberate (step 5).
- **skill**: The skill does not review the code's quality itself; pair it with guard skills.
- **skill**: The skill does not run your tests; you re-run the project's own gates in step 4.
- **skill**: The skill is not the inverse direction (Codex reviewing your work).
- **Supabase**: Self-hosted Supabase is live at https://supabase.postora.cloud.
- **frontend**: Frontend staging is https://new.postora.cloud.
- **DB and storage**: DB and storage migration are complete.
- **frontend**: Frontend URL migration and CSP are complete.
- **messaging-api**: messaging-api is deployed and healthy.
- **check-connection-health**: check-connection-health is deployed and healthy.
- **check-user-mfa**: check-user-mfa is being handled separately by OpenCode.
- **check-subscription**: check-subscription is blocked because STRIPE_SECRET_KEY is absent.
- **webhooks**: Webhooks are patched but blocked because real webhook secrets are absent.
- **migration process**: Strict rules: Read-only only. Do not edit repo files. Do not deploy functions. Do not copy files to server. Do not change DB, storage, Kong, cron, frontend, env, DNS, OAuth dashboards, or Docker. Do not print secrets. Report secret names only, never values.
- **repo functions**: 108 functions in the repo.
- **functions volume**: The functions volume isn't at the default path.
- **edge-runtime container**: The edge-runtime container holds deployed functions.
- **deployed functions**: Deployed functions = only 5 of 107.
- **self-hosted DB**: Self-hosted DB has pg_cron + pg_net installed but cron.job is EMPTY (0 scheduled jobs) — cron was not recreated.
- **frontend environment**: VITE_SUPABASE_URL=https://supabase.postora.cloud (correct), but old ref efruibswazzuuupgyzmf still in .env/config.toml.
- **Codex**: Codex can only read local files; it can't SSH or query the database.
- **Codex**: Each phase brief is self-contained because Codex has no memory.
- **Codex jobs**: Phase 1, 2, and 5 are launched as background Codex jobs concurrently for read-only, independent analyses.
- **Codex**: Codex is starting, and the rmcp error is a non-fatal MCP-auth warning for an unrelated higgsfield MCP server.
- **Codex**: Codex is starting.
- **rmcp error**: The rmcp error is a non-fatal MCP-auth warning for an unrelated higgsfield MCP server.
