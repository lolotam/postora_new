---
title: OAuth Token Refresh Project Facts 2026-06-22
summary: 'Project facts on OAuth token refresh: endpoint, rotation, expiry, security, and incident response as of 2026-06-22'
tags: []
related: [design/oauth/oauth_token_refresh_guide.md, design/oauth/oauth_token_refresh_endpoint.md]
keywords: []
createdAt: '2026-06-22T08:56:44.983Z'
updatedAt: '2026-06-22T08:56:44.983Z'
---
## Reason
Extract project-level facts, configuration, rules, and incident notes from OAuth token refresh documentation, including protocol, endpoint, rotation logic, and bugfixes.

## Raw Concept
**Task:**
Extract project-level facts, configuration, rules, and incident notes on OAuth token refresh.

**Changes:**
- Added/clarified facts for OAuth refresh endpoint, token rotation, expiry, error handling, and security.
- Captured incident notes and bugfixes for refresh endpoint and token invalidation.

**Files:**
- docs/OAUTH-TOKEN-REFRESH-GUIDE.md
- docs/POSTORA-API-INTEGRATION-GUIDE.md

**Flow:**
Refresh protocol defined → implemented in API → monitored for compliance and security → bugfixes deployed as needed

**Timestamp:** 2026-06-22

**Author:** Postora Platform Team

## Narrative
### Structure
Facts organized by subject: endpoint, protocol, security, expiry, incident notes.

### Dependencies
API and client compliance, time synchronization, endpoint availability.

### Highlights
Recent bugfixes, improved error handling, stricter security validation.

### Rules
All facts reflect current implementation and documented protocol as of 2026-06-22

## Facts
- **edge runtime container**: The self-hosted edge runtime container (postorasupabase-supabase-j8axyh-supabase-edge-functions) has zero social provider environment variables configured.
- **edge runtime container**: The only environment variables set in the edge runtime container are SUPABASE_URL and SUPABASE_DB_URL.
- **edge runtime container**: No FACEBOOK_APP_ID, INSTAGRAM_APP_ID, or TIKTOK_CLIENT_KEY environment variables exist in the container.
- **Facebook App**: The Facebook App used to issue existing user tokens has been deleted.
- **Facebook/Instagram tokens**: All existing connected Facebook/Instagram account tokens are permanently invalid.
- **user account connection**: Users must reconnect accounts, but connecting is blocked because no APP_ID is configured.
- **n8n posting pipeline**: The n8n posting pipeline (via messaging-api) is completely broken.
- **function requests**: Over 100 function requests have been logged, all failing with the Facebook App deleted error.
- **deployed functions**: The following functions are present in the edge runtime volume: _shared, check-connection-health, check-user-mfa, get-public-config, hello, main, messaging-api.
- **missing functions**: The following functions are missing from the edge runtime volume: facebook-oauth, instagram-oauth, tiktok-oauth, youtube-oauth, pinterest-oauth, pinterest-boards, process-post, process-scheduled-posts, generate-caption, generate-hashtags, generate-image, suggest-best-times, refresh-tokens, n8n-api, check-subscription, tiktok-webhook.
- **get-public-config**: The get-public-config function returns empty strings for all 8 provider fields.
- **get-public-config**: The get-public-config endpoint is confirmed live at /functions/v1/get-public-config.
- **frontend code**: No frontend code changes were made.
- **OAuth functions**: No OAuth functions were deployed because environment variables are missing.
- **Kong routes**: No Kong route changes were needed.
- **deployment plan**: The controlled deployment plan is blocked because zero provider environment variables exist in the edge container.
- **VERIFY_JWT**: VERIFY_JWT=true is confirmed and set globally.
- **get-public-config**: get-public-config has anonymous JWT injection via Kong.
- **function authentication**: All other functions require user JWT via authenticateCaller.
- **TypeScript build**: The npm run build command passes cleanly with no compiler errors.
- **OAuth flow**: The Facebook/Instagram OAuth flow is orchestrated by src/hooks/useFacebookOAuth.ts and src/hooks/useInstagramOAuth.ts.
- **facebookSdk.ts**: The Facebook SDK loader rejects with 'Facebook App ID not configured' when get-public-config returns empty.
- **get-public-config**: The get-public-config function reads 8 environment variables and returns them as JSON, but all are empty.
- **OAuth functions**: The facebook-oauth and instagram-oauth functions exist in the codebase but are not deployed.
- **messaging-api**: The messaging-api function uses stored user tokens to call the Graph API and is failing with 'Application has been deleted'.
- **JWT validation**: JWT validation for all non-public functions is handled by supabase/functions/_shared/auth-helper.ts.
- **OAuth hooks**: All other src/hooks/use*OAuth.ts files follow an identical pattern for TikTok, YouTube, Pinterest, LinkedIn, Twitter, Threads, and Reddit.
