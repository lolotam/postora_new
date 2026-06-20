---
title: Instagram Messaging Debug Investigation 2026-06-20
summary: Systematic debugging traced IG DMs not fetching to Meta App deletion/config issue, not a code or token fault. Remediation requires Meta App changes.
tags: []
related: []
keywords: []
createdAt: '2026-06-20T12:20:39.618Z'
updatedAt: '2026-06-20T12:20:39.618Z'
---
## Reason
Document systematic debugging and root cause analysis for Instagram messaging/inbox issues traced to Meta App configuration

## Raw Concept
**Task:**
Investigate and document the root cause of Instagram DMs not fetching in Postora due to Meta App deletion/config issue

**Changes:**
- Mapped Instagram messaging architecture and system boundaries
- Confirmed both access_token and user_token present and valid
- Isolated Graph API error to Meta App status
- Identified code 190 error mapping as misleading for deleted apps
- Documented required remediation steps on Meta App console

**Files:**
- Supabase secrets: FACEBOOK_APP_ID
- Meta Developer Console

**Flow:**
User requests IG DMs → edge function authenticates → checks for linked FB Page → fetches page token → calls Graph API → receives error → inbox empty

**Timestamp:** 2026-06-20

**Patterns:**
- `code 190.*Application has been deleted` (flags: i) - Meta Graph API error for deleted/disabled app

## Narrative
### Structure
Multi-component flow: frontend → edge function → Graph API → database. IG DMs require linked FB page; failure at any point results in empty inbox.

### Dependencies
Meta App must be Live and have proper App Review for advanced permissions (instagram_manage_messages, pages_messaging). App ID in edge function must match tokens.

### Highlights
Decisive diagnosis: Meta returns application deleted error; not a code or token issue. Systematic-debugging traced error across all system boundaries. Error mapping in code needs improvement.

### Rules
Rule 1: IG DMs require a linked FB page. Rule 2: Meta App must be Live and permissions approved. Rule 3: Code 190 with message "Application has been deleted" should NOT be mapped to TOKEN_EXPIRED.

### Examples
Error: {"code":190,"type":"OAuthException","message":"Error validating application. Application has been deleted."}

## Facts
- **ig_dm_linkage**: Instagram DMs do NOT work from an Instagram account alone — they require a linked Facebook Page. [project]
- **edge_fn_linkage_requirement**: Edge function getPageTokenForMessaging requires a linked FB Page to fetch IG conversations. [project]
- **no_linked_page_behavior**: If no FB page is connected/linked, the edge function throws NO_LINKED_PAGE and the inbox fetch fails. [project]
- **fb_token_storage**: Database evidence: FB page token is stored in account_metadata.user_token but edge function uses access_token column. [project]
- **token_validity**: Both access_token and user_token were present and valid, not expired as of 2026-08-12. [project]
- **meta_app_deleted_error**: Graph API returns "Application has been deleted" error (code 190, type OAuthException) on all FB→IG linkage and conversation fetch calls. [project]
- **primary_root_cause**: Primary cause is Meta/Facebook App-level failure, not Postora code or tokens. [project]
- **misleading_error_mapping**: Edge function maps code 190 to TOKEN_EXPIRED, which is misleading for app-deleted errors. [project]
- **debugging_method**: Systematic-debugging approach: evidence gathered at all system boundaries (frontend, DB, edge function, Graph API). [project]
- **remediation_action**: Remediation requires changing Meta App status, permissions, or App ID, not any code change. [project]
