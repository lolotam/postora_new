---
title: OAuth Token Refresh Endpoint
summary: Documents the OAuth refresh endpoint and token expiry duration for the platform
tags: []
related: [design/oauth/oauth_token_refresh_guide.md]
keywords: []
createdAt: '2026-06-20T10:39:48.224Z'
updatedAt: '2026-06-20T10:39:48.224Z'
---
## Reason
Curate OAuth token refresh endpoint and expiry details

## Raw Concept
**Task:**
Document OAuth token refresh endpoint and expiry duration

**Changes:**
- Added OAuth token refresh endpoint: /api/oauth/refresh
- Set OAuth token expiry to 60 minutes

**Files:**
- docs/OAUTH-TOKEN-REFRESH-GUIDE.md

**Flow:**
client requests /api/oauth/refresh -> new token issued if refresh token is valid

**Timestamp:** 2026-06-20

## Narrative
### Structure
OAuth integration uses /api/oauth/refresh for refreshing tokens. Tokens are valid for 60 minutes before requiring refresh.

### Dependencies
Requires valid refresh token; relies on backend OAuth provider implementation.

### Highlights
Standardized refresh endpoint, predictable 60-minute expiry window.

### Rules
Refresh requests must use POST method; only valid refresh tokens accepted.

## Facts
- **oauth_token_refresh_endpoint**: OAuth token refresh endpoint is /api/oauth/refresh [project]
- **oauth_token_expiry**: OAuth tokens expire every 60 minutes [project]
