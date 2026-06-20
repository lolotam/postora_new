---
title: OAuth Token Refresh Guide
summary: Comprehensive guide to OAuth token refresh logic, endpoint usage, and security best practices for handling access/refresh tokens.
tags: []
related: []
keywords: []
createdAt: '2026-06-20T10:34:08.782Z'
updatedAt: '2026-06-20T10:34:08.782Z'
---
## Reason
Document OAuth token refresh integration and best practices

## Raw Concept
**Task:**
Document OAuth token refresh logic and integration process

**Changes:**
- Added implementation guide for OAuth token refresh
- Documented endpoint usage and security considerations

**Files:**
- docs/OAUTH-TOKEN-REFRESH-GUIDE.md

**Flow:**
token expires -> refresh request sent -> new access token issued -> update client session

**Timestamp:** 2026-06-20

**Author:** system

**Patterns:**
- `^Bearer [A-Za-z0-9-._~+/]+=*$` - Matches OAuth Bearer token format

## Narrative
### Structure
This guide describes the process and requirements for handling OAuth token refresh within the platform. It covers token expiration, refresh grant flow, required endpoints, and security best practices.

### Dependencies
Requires valid refresh token, secure storage of client secrets, and endpoint access to the OAuth server.

### Highlights
Supports automatic refresh for expired tokens, secure handling of credentials, and error handling for invalid/expired refresh tokens.

### Rules
Rule 1: Always use HTTPS for token requests
Rule 2: Never expose client secrets in frontend code
Rule 3: Refresh tokens should be rotated after use

### Examples
Example: On token expiry, client makes a POST request to /oauth/token with grant_type=refresh_token.

## Facts
- **media upload issue**: The user reported that uploading media results in a broken link that is not showing. [project]
- **debugging approach**: The assistant used a systematic-debugging approach to investigate the broken media link issue. [project]
- **CreatePost page investigation**: The assistant examined the CreatePost page and the media upload/display process. [project]
- **media URL generation**: The assistant traced how media URLs are generated and displayed. [project]
- **blob URL creation and revocation**: The assistant found that `URL.createObjectURL(file)` creates a blob URL at line 724, and `URL.revokeObjectURL(file.previewUrl)` destroys it at line 783. [project]
- **uploadFileToStorage behavior**: The assistant identified that `uploadFileToStorage` sets `cloudinaryUrl` but does not update `previewUrl`, causing the `<img>` to keep rendering the blob URL. [project]
- **broken link cause**: If a draft restore or page reload happens, the blob URL becomes dead, resulting in a broken link. [project]
- **next investigation steps**: The assistant planned to examine the cloudinary-upload edge function to confirm what URL it returns and to check the Cloudinary cloud name configuration. [project]
