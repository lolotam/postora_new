/**
 * Unsplash Attribution Utilities
 * 
 * These utilities ensure proper attribution for Unsplash images as required
 * by Unsplash API guidelines. Attribution MUST appear in the social post text.
 * 
 * Format: "Photo by [Photographer Name] on Unsplash"
 */

export interface UnsplashAttributionData {
  photoId?: string;
  photographerName: string;
  photographerUsername?: string;
  photographerProfileUrl: string;
  unsplashUrl: string;
  downloadUrl?: string;
}

/**
 * Generate the attribution text to append to captions
 * This format is required by Unsplash API guidelines
 */
export function generateAttributionText(photographerName: string): string {
  return `\n\n📷 Photo by ${photographerName} on Unsplash`;
}

/**
 * Generate attribution text with link (for platforms that support links)
 */
export function generateAttributionTextWithLinks(
  photographerName: string,
  photographerUrl: string
): string {
  return `\n\n📷 Photo by ${photographerName} on Unsplash\n${photographerUrl}`;
}

/**
 * Check if a caption contains valid Unsplash attribution
 */
export function hasValidAttribution(caption: string, photographerName: string): boolean {
  if (!photographerName) return true; // No Unsplash image, no attribution needed
  
  // Check for various valid attribution formats
  const patterns = [
    // Standard format
    `Photo by ${photographerName} on Unsplash`,
    // With emoji
    `📷 Photo by ${photographerName} on Unsplash`,
    // Lowercase variations
    `photo by ${photographerName.toLowerCase()} on unsplash`,
  ];
  
  const lowerCaption = caption.toLowerCase();
  return patterns.some(pattern => 
    lowerCaption.includes(pattern.toLowerCase())
  );
}

/**
 * Extract existing attribution from caption (to preserve it during edits)
 */
export function extractAttribution(caption: string): string | null {
  // Match various attribution patterns
  const patterns = [
    /\n\n?📷?\s*Photo by .+? on Unsplash(?:\n.+)?$/i,
    /Photo by .+? on Unsplash$/i,
  ];
  
  for (const pattern of patterns) {
    const match = caption.match(pattern);
    if (match) return match[0];
  }
  
  return null;
}

/**
 * Remove attribution from caption (for replacement or editing)
 */
export function removeAttribution(caption: string): string {
  return caption
    .replace(/\n\n?📷?\s*Photo by .+? on Unsplash(?:\n.+)?$/i, '')
    .replace(/Photo by .+? on Unsplash$/i, '')
    .trim();
}

/**
 * Append attribution to caption if not already present
 */
export function appendAttribution(caption: string, photographerName: string): string {
  if (!photographerName) return caption;
  
  // Check if attribution already exists
  if (hasValidAttribution(caption, photographerName)) {
    return caption;
  }
  
  // Remove any existing (possibly different) attribution first
  const cleanCaption = removeAttribution(caption);
  
  // Append new attribution
  return cleanCaption + generateAttributionText(photographerName);
}

/**
 * Get the required attribution for files (returns first Unsplash attribution found)
 */
export function getRequiredAttribution(files: Array<{
  mediaSource?: string;
  photographerName?: string;
  photographerUrl?: string;
  unsplashUrl?: string;
}>): UnsplashAttributionData | null {
  const unsplashFile = files.find(f => 
    f.mediaSource === 'unsplash' && f.photographerName
  );
  
  if (!unsplashFile) return null;
  
  return {
    photographerName: unsplashFile.photographerName!,
    photographerProfileUrl: unsplashFile.photographerUrl || '',
    unsplashUrl: unsplashFile.unsplashUrl || 'https://unsplash.com?utm_source=postora&utm_medium=referral',
  };
}

/**
 * Validate that caption has proper attribution for Unsplash images
 * Returns error message if validation fails, null if valid
 */
export function validateCaptionAttribution(
  caption: string,
  files: Array<{
    mediaSource?: string;
    photographerName?: string;
  }>
): string | null {
  const unsplashFile = files.find(f => 
    f.mediaSource === 'unsplash' && f.photographerName
  );
  
  if (!unsplashFile) return null; // No Unsplash images, no validation needed
  
  if (!hasValidAttribution(caption, unsplashFile.photographerName!)) {
    return `Unsplash attribution is required. Please include "Photo by ${unsplashFile.photographerName} on Unsplash" in your caption.`;
  }
  
  return null;
}
