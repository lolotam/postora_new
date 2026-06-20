---
title: media_upload_preview_bug_2026_06_20
summary: Documents the root cause, fixes, and correct behavior for the media upload preview bug (broken until refresh) as of 2026-06-20.
tags: []
related: []
keywords: []
createdAt: '2026-06-20T11:43:40.008Z'
updatedAt: '2026-06-20T11:49:06.397Z'
---
## Reason
Document root cause and fixes for media upload preview bug

## Raw Concept
**Task:**
Analyze and document the root cause and resolution of the media upload preview bug where previews appeared broken until refresh.

**Changes:**
- Identified root cause of broken media upload preview: CSP did not allow blob: URLs and previewUrl was not updated after upload
- CSP img-src and media-src updated to include blob:
- uploadFileToStorage now updates previewUrl to Cloudinary URL immediately after upload and revokes orphaned blob
- Rejected outdated recall claiming edit-flow fix resolved the symptom
- Identified that blob: URLs are blocked by CSP, causing broken previews
- Determined previewUrl remains set to blob: after upload, not Cloudinary https URL
- Fixed by updating CSP to allow blob: and updating previewUrl after upload
- Added blob: to CSP img-src and media-src in nginx.conf
- Modified uploadFileToStorage to update previewUrl to Cloudinary URL after upload
- Clarified the actual effect of the edit-flow fix using file_path vs storage_bucket

**Files:**
- nginx.conf
- cloudinary integration scripts
- src/lib/mediaUrl.ts

**Flow:**
Upload media → previewUrl uses blob: URL (blocked by CSP) → upload completes → previewUrl remains blob: (broken) → after refresh/edit, previewUrl is Cloudinary https URL (works)

**Timestamp:** 2026-06-20T11:48:38.940Z

**Author:** ByteRover Assistant

**Patterns:**
- `img-src 'self' data: https:` - CSP before fix (missing blob:)
- `img-src 'self' data: https: blob:` - CSP after fix (allows blob: for previews)

## Narrative
### Structure
Documents the bug report, debugging steps, and resulting permanent fixes for post-upload media preview behavior.

### Dependencies
Depends on correct CSP configuration in nginx for production, and frontend logic in usePostForm.tsx for previewUrl handling.

### Highlights
Root cause was incorrect CSP plus previewUrl not switching to Cloudinary. Fixes are live as of commit 1e634058. Edit-flow fix using file_path only applies to scheduled post editing, not fresh uploads.

### Rules
After upload, always set previewUrl to a stable, CSP-allowed URL (e.g., Cloudinary https). Never rely on blob: URLs for permanent previews.

### Examples
Upload media: preview instantly shows real Cloudinary image without refresh. Edit scheduled post: preview resolves via file_path, never rebuilt from storage_bucket.

## Facts
- **media_upload_preview_bug_root_cause**: The root cause of the 'broken until refresh' media upload preview bug was a CSP header blocking blob: URLs, combined with the uploadFileToStorage function never updating previewUrl to the real Cloudinary URL after upload. [project]
- **media_upload_preview_bug_fix_csp**: Fix 1: The nginx.conf CSP header was updated to add blob: to img-src and media-src, allowing blob previews to render. [project]
- **media_upload_preview_bug_fix_previewUrl_update**: Fix 2: uploadFileToStorage in usePostForm.tsx now updates previewUrl to the Cloudinary https URL after upload completes and revokes the orphaned blob URL, so the preview becomes permanent immediately after upload. [project]
- **media_upload_preview_bug_incorrect_recall**: The earlier recall that claimed the edit-flow fix (using file_path instead of storage_bucket) resolved the 'broken until refresh' bug was incorrect; that fix only affects editing scheduled posts and never touches the fresh-upload preview path. [project]
- **media_upload_preview_bug_expected_behavior**: The correct preview behavior after these fixes: on upload, previewUrl is immediately set to the Cloudinary https URL (permanent, CSP-allowed); on edit, resolveMediaPublicUrl uses file_path directly, never reconstructing from storage_bucket. [project]
