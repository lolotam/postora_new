# Refactoring Plan V2 - Comprehensive Code Audit

> **Created**: January 20, 2026  
> **Purpose**: Improve app scalability, maintainability, and code readability  
> **Approach**: Break down large files into focused modules with human-readable comments

---

## Executive Summary

This document identifies all large files (>300 lines) in the codebase and proposes refactoring strategies to improve code organization, reduce cognitive load, and enhance testability.

---

## 📊 File Size Audit

### Critical Files (>700 lines) - Immediate Priority

| File | Lines | Location | Complexity |
|------|-------|----------|------------|
| `process-post/index.ts` | **4,077** | `supabase/functions/` | Very High |
| `useProfileOAuth.tsx` | **958** | `src/hooks/` | High |
| `TikTokPreCheck.tsx` | **828** | `src/components/post/` | High |
| `usePostForm.tsx` | **765** | `src/hooks/` | High |
| `usePlatformSettings.tsx` | **659** | `src/hooks/` | High |
| `CreatePost.tsx` | **636** | `src/pages/` | Medium-High |
| `useHistoryActions.tsx` | **593** | `src/hooks/` | Medium-High |

### High Priority Files (400-700 lines)

| File | Lines | Location | Complexity |
|------|-------|----------|------------|
| `HistoryTable.tsx` | **466** | `src/components/history/` | Medium |
| `BulkScheduler.tsx` | **430** | `src/components/post/` | Medium |

### Moderate Priority Files (300-400 lines)

| File | Lines | Location | Complexity |
|------|-------|----------|------------|
| `useFeatureFlags.tsx` | ~350 | `src/hooks/` | Medium |
| `Canvas.tsx` | ~423 | `src/components/canvas/` | Medium |

---

## 🔴 Priority 1: Critical Refactoring (>700 lines)

### 1.1 `process-post/index.ts` (4,077 lines)

**Current State**: Monolithic edge function handling all social media platform integrations.

**Why It's Complex**:
- Contains 10+ platform handlers (TikTok, Facebook, Instagram, LinkedIn, Pinterest, Reddit, Threads, Bluesky, Twitter, YouTube)
- Each platform has unique API requirements and authentication flows
- Supabase Edge Functions limitation prevents file imports

**Proposed Structure** (within single file due to Supabase limitations):
```
supabase/functions/process-post/index.ts
├── SECTION 1: Configuration & Types (lines 1-300)
│   ├── Imports and CORS headers
│   ├── Type definitions (PlatformMetadata, PostData, etc.)
│   └── Shared constants
├── SECTION 2: Utility Functions (lines 300-500)
│   ├── Response helpers (createJsonResponse, createErrorResponse)
│   ├── Media helpers (downloadMediaAsBlob, downloadMediaAsArrayBuffer)
│   └── Webhook helpers
├── SECTION 3: Main Handler (lines 500-800)
│   └── Deno.serve() with routing logic
├── SECTION 4-13: Platform Handlers (lines 800-4000)
│   ├── 4. Bluesky (~200 lines)
│   ├── 5. Facebook (~250 lines)
│   ├── 6. Instagram (~350 lines)
│   ├── 7. LinkedIn (~200 lines)
│   ├── 8. Pinterest (~200 lines)
│   ├── 9. Reddit (~150 lines)
│   ├── 10. Threads (~200 lines)
│   ├── 11. TikTok (~450 lines)
│   ├── 12. Twitter (~500 lines)
│   └── 13. YouTube (~400 lines)
└── SECTION 14: Error Handling & Cleanup (lines 4000-4077)
```

**Improvements**:
- Add ASCII section dividers for navigation
- Document each platform's API quirks in comments
- Extract repeated patterns into helper functions
- Add comprehensive JSDoc comments explaining API flows

---

### 1.2 `useProfileOAuth.tsx` (958 lines)

**Current State**: Handles OAuth flows for 9+ social media platforms.

**Why It's Complex**:
- Each platform has unique OAuth implementation
- Callback handling, token storage, and error management intertwined
- URL parameter parsing and state management

**Proposed Refactoring**:

```
src/hooks/oauth/
├── useProfileOAuth.tsx (main orchestrator - ~150 lines)
├── handlers/
│   ├── useTikTokOAuth.ts (~120 lines)
│   ├── useYouTubeOAuth.ts (~100 lines)
│   ├── useFacebookOAuth.ts (~120 lines)
│   ├── useLinkedInOAuth.ts (~80 lines)
│   ├── useTwitterOAuth.ts (~80 lines)
│   ├── useThreadsOAuth.ts (~80 lines)
│   ├── useRedditOAuth.ts (~80 lines)
│   ├── usePinterestOAuth.ts (~80 lines)
│   └── useBlueskyOAuth.ts (~100 lines)
├── utils/
│   ├── oauthCallbackParser.ts (~50 lines)
│   ├── accountLinker.ts (~40 lines)
│   └── oauthErrorHandler.ts (~60 lines)
└── types.ts (~50 lines)
```

**Code Comments Style**:
```typescript
// ============================================
// TIKTOK OAUTH HANDLER
// ============================================
// Handles TikTok's OAuth 2.0 flow with PKCE
// 
// Flow: 
// 1. User clicks "Connect TikTok"
// 2. Redirect to TikTok authorization page
// 3. TikTok redirects back with authorization code
// 4. Exchange code for access token via edge function
// 5. Store tokens in social_accounts table
// ============================================
```

---

### 1.3 `TikTokPreCheck.tsx` (828 lines)

**Current State**: Complex video validation component with caching, transcoding, and metadata extraction.

**Why It's Complex**:
- Multiple validation checks (format, resolution, aspect ratio, duration, size)
- Local caching with localStorage
- Supabase persistence of pre-check results
- Transcoding integration
- Complex state management

**Proposed Refactoring**:

```
src/components/post/tiktok-precheck/
├── TikTokPreCheck.tsx (main component - ~150 lines)
├── hooks/
│   ├── useVideoValidation.ts (~200 lines)
│   ├── usePreCheckCache.ts (~80 lines)
│   └── useTranscoding.ts (~100 lines)
├── utils/
│   ├── videoChecks.ts (~120 lines)
│   ├── metadataExtractor.ts (~80 lines)
│   └── cacheManager.ts (~60 lines)
├── components/
│   ├── CheckItem.tsx (~50 lines)
│   ├── TranscodeButton.tsx (~60 lines)
│   └── ValidationSummary.tsx (~80 lines)
├── constants.ts (~40 lines)
└── types.ts (~30 lines)
```

---

### 1.4 `usePostForm.tsx` (765 lines)

**Current State**: Manages all post creation form state including files, captions, scheduling, and platform selection.

**Why It's Complex**:
- Handles file uploads to Cloudinary
- Draft persistence to sessionStorage
- Platform eligibility calculations
- Media validation
- Multiple derived states

**Proposed Refactoring**:

```
src/hooks/post-form/
├── usePostForm.tsx (main hook - ~200 lines)
├── useFileUpload.ts (~150 lines)
│   └── Handles Cloudinary uploads, progress tracking
├── usePostDraft.ts (~100 lines)
│   └── Session storage persistence
├── usePlatformEligibility.ts (~120 lines)
│   └── Platform compatibility checks based on media
├── useMediaValidation.ts (~100 lines)
│   └── File type, size, format validation
├── utils/
│   ├── fileHelpers.ts (~60 lines)
│   └── platformHelpers.ts (~40 lines)
└── types.ts (~50 lines)
```

**Code Comments Style**:
```typescript
// ─────────────────────────────────────────────────────────────────
// FILE UPLOAD HANDLER
// ─────────────────────────────────────────────────────────────────
// This hook manages the upload lifecycle for media files:
//
// 1. User selects files via file picker or drag-drop
// 2. Files are validated (size, format, count limits)
// 3. Large images are compressed before upload
// 4. Files upload to Cloudinary via edge function
// 5. Progress is tracked and displayed to user
// 6. On success, file metadata is stored in state
//
// Error handling:
// - Network failures: Show retry option
// - File too large: Suggest compression
// - Invalid format: List supported formats
// ─────────────────────────────────────────────────────────────────
```

---

### 1.5 `usePlatformSettings.tsx` (659 lines)

**Current State**: Manages settings for 10+ social media platforms.

**Why It's Complex**:
- Each platform has 5-15 unique settings
- TikTok has draft persistence
- Pinterest/TikTok have API calls for boards/creator info
- Metadata builder for post submission

**Proposed Refactoring**:

```
src/hooks/platform-settings/
├── usePlatformSettings.tsx (main hook - ~150 lines)
├── platforms/
│   ├── useTikTokSettings.ts (~120 lines)
│   ├── useYouTubeSettings.ts (~100 lines)
│   ├── useInstagramSettings.ts (~80 lines)
│   ├── useFacebookSettings.ts (~70 lines)
│   ├── useTwitterSettings.ts (~90 lines)
│   ├── usePinterestSettings.ts (~80 lines)
│   ├── useLinkedInSettings.ts (~60 lines)
│   ├── useThreadsSettings.ts (~50 lines)
│   ├── useBlueskySettings.ts (~60 lines)
│   └── useRedditSettings.ts (~60 lines)
├── utils/
│   ├── metadataBuilder.ts (~80 lines)
│   └── settingsValidators.ts (~60 lines)
└── types.ts (~80 lines)
```

---

### 1.6 `CreatePost.tsx` (636 lines)

**Current State**: Main post creation page orchestrating multiple hooks and components.

**Why It's Complex**:
- Coordinates usePostForm, usePlatformSettings, useMediaEditors
- Handles post submission flow
- Platform-specific settings state bridging
- Preview panel management

**Proposed Refactoring**:

```
src/pages/post/
├── CreatePost.tsx (main page - ~200 lines)
├── hooks/
│   ├── useCreatePostFlow.ts (~150 lines)
│   │   └── Orchestrates submission, validation, publishing
│   └── useSettingsBridge.ts (~100 lines)
│       └── Bridges platform settings to component state
├── sections/
│   ├── MediaSection.tsx (~80 lines)
│   ├── CaptionSection.tsx (existing)
│   ├── PlatformSection.tsx (~60 lines)
│   └── SchedulingSection.tsx (existing)
└── utils/
    └── postSubmissionHelpers.ts (~50 lines)
```

---

### 1.7 `useHistoryActions.tsx` (593 lines)

**Current State**: Handles all post history actions including retry, delete, and bulk operations.

**Why It's Complex**:
- Multiple retry strategies (single platform, with new media, with selected accounts)
- Bulk operations (retry all failed, delete selected)
- Media cleanup (Cloudinary + Supabase storage)
- Multiple dialog states

**Proposed Refactoring**:

```
src/hooks/history/
├── useHistoryActions.tsx (main hook - ~150 lines)
├── actions/
│   ├── usePostRetry.ts (~120 lines)
│   │   └── Single and bulk retry logic
│   ├── usePostDelete.ts (~100 lines)
│   │   └── Single and bulk delete with media cleanup
│   └── useMediaCleanup.ts (~80 lines)
│       └── Cloudinary and Supabase storage cleanup
├── dialogs/
│   ├── useRetryDialog.ts (~60 lines)
│   └── useDeleteDialog.ts (~40 lines)
├── selection/
│   └── useBulkSelection.ts (~50 lines)
└── types.ts (~40 lines)
```

---

## 🟠 Priority 2: High Priority (400-700 lines)

### 2.1 `HistoryTable.tsx` (466 lines)

**Current State**: Complex table with multiple columns, status indicators, and action menus.

**Proposed Refactoring**:

```
src/components/history/
├── HistoryTable.tsx (main table - ~150 lines)
├── columns/
│   ├── TypeColumn.tsx (~30 lines)
│   ├── DateColumn.tsx (~25 lines)
│   ├── ProfileColumn.tsx (~40 lines)
│   ├── AccountColumn.tsx (~50 lines)
│   ├── PlatformColumn.tsx (~30 lines)
│   ├── CaptionColumn.tsx (~40 lines)
│   ├── StatusColumn.tsx (~35 lines)
│   ├── PostLinkColumn.tsx (~60 lines)
│   └── ActionsColumn.tsx (~50 lines)
├── utils/
│   ├── columnDefinitions.ts (~40 lines)
│   └── rowActions.ts (~30 lines)
└── types.ts (~30 lines)
```

---

### 2.2 `BulkScheduler.tsx` (430 lines)

**Current State**: CSV upload and bulk scheduling component.

**Proposed Refactoring**:

```
src/components/post/bulk-scheduler/
├── BulkScheduler.tsx (main dialog - ~120 lines)
├── components/
│   ├── CsvUploader.tsx (~80 lines)
│   ├── ParsedPostsTable.tsx (~100 lines)
│   ├── TimezoneSelector.tsx (~40 lines)
│   └── ScheduleProgress.tsx (~50 lines)
├── utils/
│   ├── csvParser.ts (~80 lines)
│   └── postValidator.ts (~50 lines)
└── types.ts (~30 lines)
```

---

## 🟡 Priority 3: Moderate Priority (300-400 lines)

### 3.1 `useFeatureFlags.tsx` (~350 lines)

**Status**: Recently modified, fairly clean structure.

**Proposed Improvements**:
- Extract notification logic to separate hook
- Create dedicated admin notification handler
- Simplify flag synchronization logic

### 3.2 `Canvas.tsx` (~423 lines)

**Status**: Already mentioned in existing REFACTORING_PLAN.md.

**Proposed Refactoring**:
```
src/components/canvas/
├── Canvas.tsx (main - ~150 lines)
├── hooks/
│   ├── useCanvasState.ts (~100 lines)
│   ├── useCanvasHistory.ts (~60 lines)
│   └── useNodeOperations.ts (~80 lines)
├── components/
│   ├── CanvasToolbar.tsx (existing)
│   ├── NodeLibrary.tsx (existing)
│   └── EmptyState.tsx (~30 lines)
└── utils/
    └── canvasHelpers.ts (~40 lines)
```

---

## 📝 Code Comment Guidelines

All refactored files should follow these commenting standards:

### File Header
```typescript
/**
 * ============================================================================
 * [FILE NAME]
 * ============================================================================
 * 
 * Purpose: [Brief description of what this file does]
 * 
 * Dependencies:
 *   - [List key dependencies and what they're used for]
 * 
 * Usage:
 *   [Show a quick example of how to use this module]
 * 
 * Related Files:
 *   - [List related files that work with this one]
 * 
 * Last Updated: [Date]
 * ============================================================================
 */
```

### Section Headers
```typescript
// ════════════════════════════════════════════════════════════════════════════
// SECTION NAME
// ════════════════════════════════════════════════════════════════════════════
```

### Function Comments
```typescript
/**
 * [Brief description of what the function does]
 * 
 * How it works:
 *   1. [Step one]
 *   2. [Step two]
 *   3. [Step three]
 * 
 * Edge cases:
 *   - [Describe any edge cases handled]
 * 
 * @param paramName - [Description of parameter]
 * @returns [Description of return value]
 * 
 * @example
 * ```typescript
 * const result = functionName(args);
 * ```
 */
```

### Inline Comments
```typescript
// NOTE: [Important context that isn't obvious from the code]

// TODO: [Future improvement needed]

// HACK: [Workaround explanation and why it's necessary]

// FIXME: [Known issue that needs addressing]

// SECURITY: [Security-related note]

// PERFORMANCE: [Performance consideration]
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. ✅ Document all large files with line counts
2. Create shared utility files first (types, helpers)
3. Refactor `useHistoryActions.tsx` (lowest coupling)

### Phase 2: OAuth System (Week 3-4)
1. Extract `useProfileOAuth.tsx` into platform-specific handlers
2. Create shared OAuth utilities
3. Add comprehensive error handling

### Phase 3: Post Creation (Week 5-6)
1. Refactor `usePostForm.tsx`
2. Refactor `usePlatformSettings.tsx`
3. Update `CreatePost.tsx` to use new hooks

### Phase 4: Components (Week 7-8)
1. Refactor `TikTokPreCheck.tsx`
2. Refactor `HistoryTable.tsx`
3. Refactor `BulkScheduler.tsx`

### Phase 5: Edge Functions (Week 9-10)
1. Reorganize `process-post/index.ts` internally
2. Add comprehensive documentation
3. Extract repeated patterns

---

## ✅ Benefits After Refactoring

| Metric | Before | After |
|--------|--------|-------|
| Avg. file size | ~600 lines | ~150 lines |
| Max file size (frontend) | 958 lines | ~200 lines |
| Test coverage potential | Low | High |
| New dev onboarding time | Days | Hours |
| Bug isolation difficulty | High | Low |
| Code reusability | Low | High |

---

## 📋 Refactoring Checklist

For each file being refactored:

- [ ] Create new directory structure
- [ ] Extract types to `types.ts`
- [ ] Extract utilities to `utils/` folder
- [ ] Create focused hooks with single responsibility
- [ ] Add comprehensive comments following guidelines
- [ ] Update imports in dependent files
- [ ] Test all functionality
- [ ] Update this document with completion status

---

## 🔗 Related Documents

- [Original REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - Contains completed Phase 1-5 refactoring
- [Supabase Types](./src/integrations/supabase/types.ts) - Database type definitions (auto-generated)

---

*This document should be updated as refactoring progresses. Mark completed items with ✅ and add notes about any deviations from the plan.*
