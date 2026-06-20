import { Platform } from "@/lib/types";
import { MediaAnalysis } from "@/lib/mediaAnalyzer";
import { platformMediaSupport, platformDisplayNames } from "@/lib/platformMediaSupport";

/**
 * Result of checking platform eligibility for current media
 */
export interface PlatformEligibility {
  platform: Platform;
  isEligible: boolean;
  reason?: string; // Why it's disabled
  warningReason?: string; // Partial support warning
}

/**
 * Check if a specific platform is eligible for the given media analysis
 */
export function getPlatformEligibility(
  platform: Platform,
  analysis: MediaAnalysis
): PlatformEligibility {
  const support = platformMediaSupport[platform];
  const name = platformDisplayNames[platform];
  
  // Text-only posts
  if (analysis.isTextOnly) {
    if (!support.textOnly) {
      return {
        platform,
        isEligible: false,
        reason: "Requires media",
      };
    }
    return { platform, isEligible: true };
  }
  
  // === GIF checks ===
  if (analysis.hasGifs) {
    // Multiple GIFs
    if (analysis.gifCount > 1) {
      if (!support.multipleGifs) {
        return {
          platform,
          isEligible: false,
          reason: support.singleGif ? "1 GIF max" : "No GIF support",
        };
      }
    }
    
    // Single GIF
    if (analysis.isSingleGif) {
      if (!support.singleGif) {
        return {
          platform,
          isEligible: false,
          reason: "No GIF support",
        };
      }
      
      // Check for GIF warning (e.g., LinkedIn shows as static)
      if (support.gifNote) {
        return {
          platform,
          isEligible: true,
          warningReason: support.gifNote,
        };
      }
    }
    
    // GIFs mixed with other media
    if (analysis.hasMixedWithGif) {
      if (!support.mixedWithGif) {
        return {
          platform,
          isEligible: false,
          reason: "Can't mix GIFs with other media",
        };
      }
    }
  }
  
  // === Mixed media checks (photos + videos) ===
  if (analysis.isMixedMedia) {
    if (!support.mixedMedia) {
      return {
        platform,
        isEligible: false,
        reason: "Can't mix photos & videos",
      };
    }
  }
  
  // === Video checks ===
  if (analysis.hasVideos && !analysis.hasImages && !analysis.hasGifs) {
    // Multiple videos
    if (analysis.videoCount > 1) {
      if (!support.multipleVideos) {
        return {
          platform,
          isEligible: false,
          reason: "1 video max",
        };
      }
      
      if (support.maxVideos > 0 && analysis.videoCount > support.maxVideos) {
        return {
          platform,
          isEligible: false,
          reason: `Max ${support.maxVideos} videos`,
        };
      }
    }
    
    // Single video - almost all platforms support this
    if (analysis.isSingleVideo) {
      if (!support.singleVideo) {
        return {
          platform,
          isEligible: false,
          reason: "No video support",
        };
      }
    }
  }
  
  // === Photo checks ===
  if (analysis.hasImages && !analysis.hasVideos && !analysis.hasGifs) {
    // Multiple photos
    if (analysis.imageCount > 1) {
      if (support.maxPhotos <= 1) {
        // Platform doesn't support multiple photos
        if (platform === "pinterest") {
          return {
            platform,
            isEligible: true,
            warningReason: "Creates separate pins",
          };
        }
        return {
          platform,
          isEligible: false,
          reason: "1 photo max",
        };
      }
      
      if (analysis.imageCount > support.maxPhotos) {
        return {
          platform,
          isEligible: false,
          reason: `Max ${support.maxPhotos} photos`,
        };
      }
      
      // TikTok requires minimum photos for carousel
      if (support.minPhotosForCarousel && analysis.imageCount < support.minPhotosForCarousel) {
        return {
          platform,
          isEligible: false,
          reason: `Min ${support.minPhotosForCarousel} photos needed`,
        };
      }
    }
    
    // Single photo
    if (analysis.isSinglePhoto) {
      if (!support.singlePhoto) {
        // TikTok requires carousel
        if (support.minPhotosForCarousel) {
          return {
            platform,
            isEligible: false,
            reason: `Min ${support.minPhotosForCarousel} photos needed`,
          };
        }
        return {
          platform,
          isEligible: false,
          reason: "No photo support",
        };
      }
    }
  }
  
  // === Requires media check ===
  if (support.requiresMedia && analysis.isTextOnly) {
    return {
      platform,
      isEligible: false,
      reason: "Requires media",
    };
  }
  
  // All checks passed
  return { platform, isEligible: true };
}

/**
 * Get eligibility status for all platforms given the current media
 */
export function getAllPlatformEligibility(
  analysis: MediaAnalysis,
  availablePlatforms: Platform[]
): PlatformEligibility[] {
  return availablePlatforms.map((platform) =>
    getPlatformEligibility(platform, analysis)
  );
}

/**
 * Get list of eligible platforms
 */
export function getEligiblePlatforms(
  analysis: MediaAnalysis,
  availablePlatforms: Platform[]
): Platform[] {
  return availablePlatforms.filter(
    (platform) => getPlatformEligibility(platform, analysis).isEligible
  );
}

/**
 * Get list of ineligible platforms with reasons
 */
export function getIneligiblePlatforms(
  analysis: MediaAnalysis,
  availablePlatforms: Platform[]
): PlatformEligibility[] {
  return availablePlatforms
    .map((platform) => getPlatformEligibility(platform, analysis))
    .filter((e) => !e.isEligible);
}
