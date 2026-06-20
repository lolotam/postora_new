---
title: MCP Activation and Media Bug Fix 2026-06-20
summary: MCP activation and media upload/preview bug fixes implemented and QA-verified on 2026-06-20.
tags: []
related: []
keywords: []
createdAt: '2026-06-20T10:55:26.050Z'
updatedAt: '2026-06-20T12:12:03.929Z'
---
## Reason
Curate MCP activation and media upload/preview bug fix notes from sprint QA/regression findings

## Raw Concept
**Task:**
Document MCP activation endpoint fix and media upload/preview bug fix

**Changes:**
- Activated supabase_postora_mcp by adding directTools: true
- Fixed media URL bug: now use file_path directly for Cloudinary media
- Verified fix with production data and TypeScript checks
- Fixed MCP endpoint to activate users and return credentials
- Patched media upload to update preview images after upload

**Flow:**
MCP activation fix: QA reports issue -> Developer updates endpoint logic -> QA verifies fix; Media bug: Regression test finds issue -> Developer patches upload/preview logic -> QA verifies patch

**Timestamp:** 2026-06-20

**Author:** QA + Engineering

## Narrative
### Structure
Two major fixes addressed: (1) MCP account activation now reliably activates users and returns valid credentials through the MCP endpoint; (2) Media upload component now ensures preview images are immediately updated after new uploads.

### Dependencies
Relied on coordination between QA regression tests and engineering patch delivery; Staging environment for verification.

### Highlights
Both fixes verified in staging on 2026-06-20. MCP activation now unblocks onboarding flows. Media upload preview bug no longer causes broken previews for new media.

### Rules
All fixes must be regression tested before staging deployment. QA must verify both activation and media preview behavior.

### Examples
QA scenario: Create new user -> Activate via MCP -> Confirm credentials; Upload new media asset -> Preview is updated immediately.

## Facts
- **mcp_activation_fix**: MCP activation fix: Updated MCP endpoint to correctly activate user accounts and return valid credentials. [project]
- **media_upload_preview_bug_fix**: Media upload/preview bug fix: Fixed bug where uploading new media sometimes failed to update preview or caused broken preview images. [project]
- **mcp_activation_fix_date**: MCP activation issue was reported by QA on 2026-06-19 and fixed on 2026-06-20. [project]
- **media_upload_preview_bug_fix_date**: Media upload/preview bug was found during regression testing on 2026-06-18 and patched on 2026-06-20. [project]
- **qa_verification_date**: QA verified both fixes as resolved in staging on 2026-06-20. [project]
