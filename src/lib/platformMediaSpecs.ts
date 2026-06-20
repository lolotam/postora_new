/**
 * Unified platform media specifications for social media platforms.
 * Consolidates aspect ratios, file size limits, and format requirements.
 */

import { Platform } from "@/lib/types";

/**
 * Aspect ratio configuration for a platform
 */
export interface AspectRatioConfig {
  value: string;
  label: string;
  /** Minimum ratio value (width/height) */
  min: number;
  /** Maximum ratio value (width/height) */
  max: number;
}

/**
 * Platform aspect ratio requirements
 */
export interface PlatformAspectRatios {
  ratios: AspectRatioConfig[];
  recommended: string;
}

/**
 * Platform file size limits in bytes
 */
export interface PlatformFileSizeLimits {
  video: number;
  image: number;
}

/**
 * Full platform media specifications
 */
export interface PlatformMediaSpec {
  /** Maximum image file size in bytes */
  maxImageSize: number;
  /** Maximum video file size in bytes */
  maxVideoSize: number;
  /** Supported image MIME types */
  supportedImageFormats: string[];
  /** Supported video MIME types */
  supportedVideoFormats: string[];
  /** Maximum image dimensions */
  maxImageDimensions: { width: number; height: number };
  /** Supported aspect ratios */
  aspectRatios: string[];
}

/**
 * Aspect ratio validation result for a platform
 */
export interface AspectRatioValidation {
  platform: string;
  isValid: boolean;
  currentRatio: number;
  recommendedRatio: string;
  suggestion: string;
}

// =============================================================================
// ASPECT RATIO SPECIFICATIONS
// =============================================================================

/**
 * Platform-specific aspect ratio requirements for videos and images
 */
export const PLATFORM_ASPECT_RATIOS: Record<string, PlatformAspectRatios> = {
  tiktok: {
    ratios: [
      { value: "9:16", label: "Vertical (9:16)", min: 0.5, max: 0.6 },
    ],
    recommended: "9:16",
  },
  instagram: {
    ratios: [
      { value: "1:1", label: "Square (1:1)", min: 0.95, max: 1.05 },
      { value: "4:5", label: "Portrait (4:5)", min: 0.75, max: 0.85 },
      { value: "9:16", label: "Story/Reel (9:16)", min: 0.5, max: 0.6 },
      { value: "16:9", label: "Landscape (16:9)", min: 1.7, max: 1.85 },
    ],
    recommended: "4:5",
  },
  youtube: {
    ratios: [
      { value: "16:9", label: "Widescreen (16:9)", min: 1.7, max: 1.85 },
    ],
    recommended: "16:9",
  },
  facebook: {
    ratios: [
      { value: "1:1", label: "Square (1:1)", min: 0.95, max: 1.05 },
      { value: "4:5", label: "Portrait (4:5)", min: 0.75, max: 0.85 },
      { value: "16:9", label: "Landscape (16:9)", min: 1.7, max: 1.85 },
      { value: "9:16", label: "Reel (9:16)", min: 0.5, max: 0.6 },
    ],
    recommended: "1:1",
  },
  twitter: {
    ratios: [
      { value: "16:9", label: "Landscape (16:9)", min: 1.7, max: 1.85 },
      { value: "1:1", label: "Square (1:1)", min: 0.95, max: 1.05 },
    ],
    recommended: "16:9",
  },
  linkedin: {
    ratios: [
      { value: "1:1", label: "Square (1:1)", min: 0.95, max: 1.05 },
      { value: "16:9", label: "Landscape (16:9)", min: 1.7, max: 1.85 },
      { value: "9:16", label: "Portrait (9:16)", min: 0.5, max: 0.6 },
    ],
    recommended: "1:1",
  },
  pinterest: {
    ratios: [
      { value: "2:3", label: "Vertical (2:3)", min: 0.6, max: 0.7 },
      { value: "1:1", label: "Square (1:1)", min: 0.95, max: 1.05 },
    ],
    recommended: "2:3",
  },
};

// =============================================================================
// FILE SIZE LIMITS
// =============================================================================

/**
 * Platform-specific file size limits
 */
export const PLATFORM_FILE_SIZE_LIMITS: Record<string, PlatformFileSizeLimits> = {
  tiktok: {
    video: 4 * 1024 * 1024 * 1024, // 4GB
    image: 20 * 1024 * 1024, // 20MB
  },
  instagram: {
    video: 650 * 1024 * 1024, // 650MB for Reels
    image: 8 * 1024 * 1024, // 8MB
  },
  youtube: {
    video: 256 * 1024 * 1024 * 1024, // 256GB (verified accounts)
    image: 2 * 1024 * 1024, // 2MB for thumbnails
  },
  facebook: {
    video: 10 * 1024 * 1024 * 1024, // 10GB
    image: 4 * 1024 * 1024, // 4MB
  },
  twitter: {
    video: 512 * 1024 * 1024, // 512MB
    image: 5 * 1024 * 1024, // 5MB
  },
  linkedin: {
    video: 5 * 1024 * 1024 * 1024, // 5GB
    image: 5 * 1024 * 1024, // 5MB
  },
  pinterest: {
    video: 2 * 1024 * 1024 * 1024, // 2GB
    image: 20 * 1024 * 1024, // 20MB
  },
};

// =============================================================================
// FULL MEDIA SPECIFICATIONS (for validation)
// =============================================================================

/**
 * Complete media specifications for each platform
 */
export const PLATFORM_MEDIA_SPECS: Record<string, PlatformMediaSpec> = {
  instagram: {
    maxImageSize: 30 * 1024 * 1024, // 30MB
    maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/webp'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    maxImageDimensions: { width: 1080, height: 1350 },
    aspectRatios: ['1:1', '4:5', '1.91:1'],
  },
  facebook: {
    maxImageSize: 30 * 1024 * 1024, // 30MB
    maxVideoSize: 10 * 1024 * 1024 * 1024, // 10GB
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxImageDimensions: { width: 2048, height: 2048 },
    aspectRatios: ['1:1', '16:9', '9:16', '4:5'],
  },
  tiktok: {
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
    supportedImageFormats: ['image/jpeg', 'image/png'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    maxImageDimensions: { width: 1080, height: 1920 },
    aspectRatios: ['9:16'],
  },
  twitter: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 512 * 1024 * 1024, // 512MB
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedVideoFormats: ['video/mp4'],
    maxImageDimensions: { width: 4096, height: 4096 },
    aspectRatios: ['1:1', '16:9', '4:3'],
  },
  linkedin: {
    maxImageSize: 8 * 1024 * 1024, // 8MB
    maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    maxImageDimensions: { width: 1200, height: 1200 },
    aspectRatios: ['1:1', '1.91:1', '4:5'],
  },
  youtube: {
    maxImageSize: 2 * 1024 * 1024, // 2MB for thumbnails
    maxVideoSize: 256 * 1024 * 1024 * 1024, // 256GB
    supportedImageFormats: ['image/jpeg', 'image/png'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxImageDimensions: { width: 1280, height: 720 },
    aspectRatios: ['16:9'],
  },
  pinterest: {
    maxImageSize: 20 * 1024 * 1024, // 20MB
    maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
    supportedImageFormats: ['image/jpeg', 'image/png'],
    supportedVideoFormats: ['video/mp4'],
    maxImageDimensions: { width: 1000, height: 1500 },
    aspectRatios: ['2:3', '1:1'],
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Validate aspect ratio for selected platforms
 * @param width - Media width in pixels
 * @param height - Media height in pixels
 * @param platforms - List of platform names
 * @returns Array of validation results per platform
 */
export function validateAspectRatioForPlatforms(
  width: number,
  height: number,
  platforms: string[]
): AspectRatioValidation[] {
  const currentRatio = width / height;
  const validations: AspectRatioValidation[] = [];

  for (const platform of platforms) {
    const platformSpec = PLATFORM_ASPECT_RATIOS[platform.toLowerCase()];
    if (!platformSpec) continue;

    let isValid = false;
    let matchedRatio = "";

    for (const ratio of platformSpec.ratios) {
      if (currentRatio >= ratio.min && currentRatio <= ratio.max) {
        isValid = true;
        matchedRatio = ratio.value;
        break;
      }
    }

    let suggestion = "";
    if (!isValid) {
      const recommended = platformSpec.recommended;
      const [recW, recH] = recommended.split(":").map(Number);
      const targetRatio = recW / recH;
      
      if (currentRatio > targetRatio) {
        // Too wide - need to crop width
        const newWidth = Math.round(height * targetRatio);
        suggestion = `Crop to ${newWidth}×${height} (${recommended})`;
      } else {
        // Too tall - need to crop height
        const newHeight = Math.round(width / targetRatio);
        suggestion = `Crop to ${width}×${newHeight} (${recommended})`;
      }
    }

    validations.push({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      isValid,
      currentRatio,
      recommendedRatio: matchedRatio || platformSpec.recommended,
      suggestion,
    });
  }

  return validations;
}

/**
 * Check if file size is within platform limits
 * @param fileSize - File size in bytes
 * @param fileType - Type of file ("video" or "image")
 * @param platforms - List of platform names
 * @returns Validation result with warnings
 */
export function checkFileSizeForPlatforms(
  fileSize: number,
  fileType: "video" | "image",
  platforms: string[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (const platform of platforms) {
    const limits = PLATFORM_FILE_SIZE_LIMITS[platform.toLowerCase()];
    if (!limits) continue;

    const limit = fileType === "video" ? limits.video : limits.image;
    if (fileSize > limit) {
      warnings.push(
        `${platform.charAt(0).toUpperCase() + platform.slice(1)}: File exceeds ${formatFileSize(limit)} limit (your file: ${formatFileSize(fileSize)})`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get the media spec for a specific platform
 * @param platform - Platform name
 * @returns Platform media spec or undefined
 */
export function getPlatformMediaSpec(platform: string): PlatformMediaSpec | undefined {
  return PLATFORM_MEDIA_SPECS[platform.toLowerCase()];
}

/**
 * Get aspect ratio config for a platform
 * @param platform - Platform name
 * @returns Platform aspect ratios or undefined
 */
export function getPlatformAspectRatios(platform: string): PlatformAspectRatios | undefined {
  return PLATFORM_ASPECT_RATIOS[platform.toLowerCase()];
}
