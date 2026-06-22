---
title: OAuth Token Refresh Update
summary: OAuth token refresh update protocol and implementation facts extracted from RLM context.
tags: []
related: [project_management/retrospectives/context.md, design/oauth/oauth_token_refresh_endpoint.md, design/oauth/oauth_token_refresh_guide.md, facts/project/oauth_token_refresh_project_facts_2026_06_22.md]
keywords: []
createdAt: '2026-06-20T10:46:30.554Z'
updatedAt: '2026-06-22T09:15:23.795Z'
---
## Reason
Curate OAuth token refresh update context from RLM extraction

## Raw Concept
**Task:**
Document OAuth token refresh update protocols and implementation

**Changes:**
- Fixed frontend OAuth reauth-flag gap
- Frontend redeploy triggers after OAuth fixes
- No need to manually delete expired auth accounts
- Dokploy deploymentId KdextYt_nHD_oz9ZVPDun used for redeploy
- Commit 7ca56785 fixed the frontend OAuth reauth-flag gap
- UI flags clear after reconnect and query refresh
- Updated OAuth refresh token protocols and endpoint implementation.

**Files:**
- Dokploy deployment system
- commit 7ca56785
- src/hooks
- docs/OAUTH-TOKEN-REFRESH-GUIDE.md

**Flow:**
User initiates token refresh -> System validates and issues new tokens -> Old tokens invalidated

**Timestamp:** 2026-06-22

**Author:** RLM extraction

## Narrative
### Structure
Describes OAuth refresh flow, endpoint behavior, and integration details.

### Dependencies
Requires OAuth client registration and secure storage of refresh and access tokens.

### Highlights
Refresh token endpoint accepts valid tokens, issues new tokens, and invalidates previous sessions.

### Rules
Refresh tokens should not be reused after rotation. Access tokens must have a short TTL. All refresh operations are logged for security review.

### Examples
Example: POST /oauth/token with grant_type=refresh_token returns new access and refresh tokens.

## Facts
- **OAuth deployment**: Real provider credentials are missing, so the correct status is BLOCKED.
- **Credential delivery method**: The user will provide the real credentials later through a secure host file or Dokploy environment, not through chat.
- **OAuth deployment**: Do not deploy facebook-oauth or instagram-oauth.
- **Container management**: Do not restart containers.
- **Infrastructure management**: Do not change DNS, DB, Kong, cron, or provider dashboards.
- **Secret handling**: Do not print secret values.
- **Assistant task**: Prepare only the secure-env instructions for the user.
- **Secure file path**: Expected secure file path is /root/postora_meta_oauth.env.
- **Secure file format**: Expected file format includes FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, PUBLIC_API_ORIGIN, and optionally FACEBOOK_GRAPH_API_VERSION.
- **Deployment steps**: After the user confirms the file exists, the next tasks are: load values into the correct self-hosted Supabase edge-functions environment, restart only required Supabase containers, verify get-public-config returns non-empty FACEBOOK_APP_ID and INSTAGRAM_APP_ID without printing values, deploy facebook-oauth and instagram-oauth only, and test boot and auth behavior.
