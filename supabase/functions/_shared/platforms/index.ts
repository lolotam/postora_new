/**
 * Platform Handlers - Shared Modules
 * 
 * This directory contains extracted utilities and types for platform posting.
 * Due to Supabase Edge Function limitations, the main platform handler logic
 * remains in process-post/index.ts, but these shared modules reduce duplication.
 * 
 * Structure:
 * - types.ts: Shared type definitions (PlatformMetadata, PostData, etc.)
 * - media-helpers.ts: Media download and type detection utilities
 * - polling-helpers.ts: Async polling and retry utilities
 * 
 * Usage in edge functions:
 * ```ts
 * import { PlatformMetadata, PlatformPostResult } from "../_shared/platforms/types.ts";
 * import { downloadMediaAsArrayBuffer, isVideoUrl } from "../_shared/platforms/media-helpers.ts";
 * import { pollWithRetry, delay } from "../_shared/platforms/polling-helpers.ts";
 * ```
 */

export * from "./types.ts";
export * from "./media-helpers.ts";
export * from "./polling-helpers.ts";
