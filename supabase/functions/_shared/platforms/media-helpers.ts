/**
 * Shared media helper functions for platform handlers
 * These utilities are used across multiple platform posting functions
 */

/**
 * Download media from URL as an ArrayBuffer with metadata
 */
export async function downloadMediaAsArrayBuffer(url: string): Promise<{
  buffer: ArrayBuffer;
  bytes: Uint8Array;
  mimeType: string;
  size: number;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media (${response.status})`);
  }
  const mimeType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0];
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return { buffer, bytes, mimeType, size: buffer.byteLength };
}

/**
 * Download media from URL as a Blob
 */
export async function downloadMediaAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media (${response.status})`);
  }
  return response.blob();
}

/**
 * Check if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (/\.(mp4|mov|avi|wmv|webm|m4v|mkv|flv|3gp)$/.test(cleanUrl)) return true;
  if (cleanUrl.includes("/video/upload/")) return true; // Cloudinary video URLs
  return false;
}

/**
 * Check if a URL points to an image file
 */
export function isImageUrl(url: string): boolean {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(cleanUrl);
}

/**
 * Check if a URL points to a GIF file
 */
export function isGifUrl(url: string): boolean {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith('.gif');
}

/**
 * Get the file extension from a URL
 */
export function getFileExtension(url: string): string {
  const cleanUrl = url.split("?")[0].toLowerCase();
  const match = cleanUrl.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

/**
 * Determine media type from URL
 */
export function getMediaType(url: string): 'video' | 'image' | 'gif' | 'unknown' {
  if (isVideoUrl(url)) return 'video';
  if (isGifUrl(url)) return 'gif';
  if (isImageUrl(url)) return 'image';
  return 'unknown';
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    // Videos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv',
    '3gp': 'video/3gpp',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
