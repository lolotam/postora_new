---
title: OAuth Token Refresh Update
summary: Details the updated OAuth token refresh workflow, fixes to frontend flag handling, and deployment steps.
tags: []
related: [project_management/retrospectives/context.md, design/oauth/oauth_token_refresh_endpoint.md]
keywords: []
createdAt: '2026-06-20T10:46:30.554Z'
updatedAt: '2026-06-20T10:46:30.554Z'
---
## Reason
Curate extracted RLM context about recent OAuth token refresh improvements and workflow

## Raw Concept
**Task:**
Update and document the OAuth token refresh workflow and related frontend/backend fixes

**Changes:**
- Fixed frontend OAuth reauth-flag gap
- Frontend redeploy triggers after OAuth fixes
- No need to manually delete expired auth accounts
- Dokploy deploymentId KdextYt_nHD_oz9ZVPDun used for redeploy
- Commit 7ca56785 fixed the frontend OAuth reauth-flag gap
- UI flags clear after reconnect and query refresh

**Files:**
- Dokploy deployment system
- commit 7ca56785
- src/hooks

**Flow:**
OAuth fix applied -> frontend redeployed via Dokploy -> user reconnects and refreshes query -> UI flags clear

**Timestamp:** 2026-06-20

**Author:** ByteRover Context Engineer

## Narrative
### Structure
OAuth token refresh workflow now includes automated frontend redeploy and verification steps after backend fixes. UI flags related to expired auth accounts are automatically cleared after user reconnect and refresh.

### Dependencies
Requires Dokploy deployment system for frontend redeploy. Depends on commit 7ca56785 for frontend fix. Relies on project retrospective documentation for workflow validation.

### Highlights
No manual cleanup of expired accounts is needed. Frontend redeploy ensures new code is live. UI flags clear as expected after reconnect and refresh.

## Facts
- **supabase_prolifepharma_mcp and supabase_postora_mcp**: Both `supabase_prolifepharma_mcp` (active) and `supabase_postora_mcp` (not connected) have identical config structure.
- **supabase_prolifepharma_mcp and supabase_postora_mcp**: The difference between the two servers must be in which servers are trusted/enabled to auto-connect at startup.
- **mcp.json**: The config structures are identical, so the active-vs-inactive difference isn't in `mcp.json`.
- **mcp-cache.json**: The `mcp-cache.json` (615KB) likely holds per-server connection/permission metadata.
- **supabase_prolifepharma_mcp and supabase_postora_mcp**: Both servers are cached.
- **supabase_prolifepharma_mcp and supabase_postora_mcp**: The cache proves both servers are structurally identical (same 4 keys, 20 tools each).
- **mcp-cache.json**: The cache isn't what decides active-vs-inactive — that's a runtime setting.
- **mcp.json**: The decisive lever in `mcp.json` is the `"directTools": true` flag.
- **active servers**: Every server that's truly active (eagerly spawned at startup with directly-callable tools) has `"directTools": true`.
- **supabase_postora_mcp**: `supabase_postora_mcp` is missing the `"directTools": true` flag, so it's lazy/gateway-only ("cached").
- **supabase_postora_mcp**: The fix is to add the `"directTools": true` flag so it loads eagerly like the others.
- **supabase_postora_mcp**: The fix was applied and verified.
- **supabase_postora_mcp**: `supabase_postora_mcp` was in `mcp.json` but missing the `"directTools": true` flag — that's the single setting that makes an MCP server active (spawned eagerly at startup, tools directly callable) vs cached/lazy (only loads on-demand through the gateway).
- **supabase_prolifepharma_mcp and supabase_postora_mcp**: The cache confirmed both supabase servers were structurally identical (same 4 keys, 20 tools each) — so it was purely a runtime config flag, not a data issue.
- **supabase_postora_mcp**: In `C:\Users\HP\.pi\agent\mcp.json`, `"directTools": true` was added to the `supabase_postora_mcp` block — matching the pattern used by all other active servers.
- **mcp.json**: JSON validated: 19 servers intact, postora flag confirmed `true`, project-ref `efruibswazzuuupgyzmf` correct.
- **pi**: Restart pi for the change to take effect.
- **supabase_postora_mcp**: After restart, `supabase_postora_mcp` will show as active (not cached) and its 20 tools will be directly callable.
- **supabase_postora_mcp**: The server is configured `--read-only`, which is fine for investigating the media bug (SELECT queries).
- **supabase_postora_mcp**: If you later need to run migrations/writes through it, remove the `--read-only` flag.
