import { Platform } from "@/lib/types";

/**
 * Platform media support configuration based on 2026 specifications
 * This defines what each platform supports in terms of media types and quantities
 */
export interface PlatformMediaSupport {
  // Text-only posts
  textOnly: boolean;
  
  // Photo support
  singlePhoto: boolean;
  maxPhotos: number; // 0 if photos not supported
  
  // GIF support
  singleGif: boolean;
  multipleGifs: boolean;
  gifNote?: string; // e.g., "displays as static"
  
  // Video support
  singleVideo: boolean;
  multipleVideos: boolean;
  maxVideos: number; // 0 if not supported
  
  // Mixed media support
  mixedMedia: boolean; // Can mix photos + videos
  mixedWithGif: boolean; // Can mix photos/videos + GIFs
  
  // Special requirements
  requiresMedia: boolean; // No text-only posts allowed
  minPhotosForCarousel?: number; // e.g., TikTok requires 4+ photos
}

/**
 * Comprehensive media support configuration for all platforms
 * Based on 2026 platform specifications
 */
export const platformMediaSupport: Record<Platform, PlatformMediaSupport> = {
  instagram: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 20,
    singleGif: false, // Instagram does NOT support GIFs - converts to static or video
    multipleGifs: false,
    singleVideo: true,
    multipleVideos: true,
    maxVideos: 20,
    mixedMedia: true, // Photos + videos in carousel
    mixedWithGif: false,
    requiresMedia: false,
  },
  
  facebook: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 10,
    singleGif: true,
    multipleGifs: true,
    singleVideo: true,
    multipleVideos: true,
    maxVideos: 10,
    mixedMedia: true,
    mixedWithGif: true, // Full mixed support
    requiresMedia: false,
  },
  
  twitter: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 4,
    singleGif: true,
    multipleGifs: false, // Only 1 GIF per tweet
    singleVideo: true,
    multipleVideos: false, // Only 1 video per tweet
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: false,
  },
  
  linkedin: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 9,
    singleGif: true,
    multipleGifs: false,
    gifNote: "GIF displays as static image",
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: false,
  },
  
  bluesky: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 4,
    singleGif: true, // Bluesky supports GIFs
    multipleGifs: false, // Only 1 GIF per post
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: false,
  },
  
  tiktok: {
    textOnly: false,
    singlePhoto: false, // Requires carousel with 4+ photos
    maxPhotos: 35,
    minPhotosForCarousel: 4, // TikTok requires 4-35 photos for carousel
    singleGif: false, // TikTok does NOT support GIFs
    multipleGifs: false,
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: true, // Must have media
  },
  
  youtube: {
    textOnly: false,
    singlePhoto: false, // YouTube is video-only
    maxPhotos: 0,
    singleGif: false, // YouTube does NOT support GIFs
    multipleGifs: false,
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: true, // Must have video
  },
  
  threads: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 20,
    singleGif: true,
    multipleGifs: true,
    singleVideo: true,
    multipleVideos: true,
    maxVideos: 20,
    mixedMedia: true,
    mixedWithGif: true, // Full mixed support like Facebook
    requiresMedia: false,
  },
  
  pinterest: {
    textOnly: false,
    singlePhoto: true,
    maxPhotos: 1, // Multiple photos create separate pins
    singleGif: true, // Pinterest supports GIFs
    multipleGifs: false, // Creates separate pins
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: true, // Must have media
  },
  
  reddit: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 20,
    singleGif: true,
    multipleGifs: false,
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: false,
  },
  whatsapp: {
    textOnly: true,
    singlePhoto: true,
    maxPhotos: 1,
    singleGif: false,
    multipleGifs: false,
    singleVideo: true,
    multipleVideos: false,
    maxVideos: 1,
    mixedMedia: false,
    mixedWithGif: false,
    requiresMedia: false,
  },
};

/**
 * Get human-readable platform names
 */
export const platformDisplayNames: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
  pinterest: "Pinterest",
  reddit: "Reddit",
  whatsapp: "WhatsApp",
};
