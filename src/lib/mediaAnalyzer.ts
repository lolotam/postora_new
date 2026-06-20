import { UploadedFile } from "@/hooks/usePostForm";

/**
 * Result of analyzing uploaded media files
 */
export interface MediaAnalysis {
  // Counts
  totalFiles: number;
  imageCount: number;
  videoCount: number;
  gifCount: number;
  
  // Boolean checks
  hasImages: boolean;
  hasVideos: boolean;
  hasGifs: boolean;
  
  // Specific states
  isSinglePhoto: boolean;
  isMultiplePhotos: boolean;
  isSingleVideo: boolean;
  isMultipleVideos: boolean;
  isSingleGif: boolean;
  isMultipleGifs: boolean;
  
  // Mixed media detection
  isMixedMedia: boolean; // images + videos together
  hasMixedWithGif: boolean; // any media + GIFs
  
  // Text only
  isTextOnly: boolean;
}

/**
 * Detect if a file is a GIF based on its properties
 */
function isGifFile(file: UploadedFile): boolean {
  // Check fileType first (if explicitly set to gif)
  if (file.fileType === "gif") {
    return true;
  }
  
  // Check file MIME type
  if (file.file?.type === "image/gif") {
    return true;
  }
  
  // Check file extension in name
  const fileName = file.file?.name?.toLowerCase() || "";
  if (fileName.endsWith(".gif")) {
    return true;
  }
  
  // Check preview URL for GIF extension
  const previewUrl = file.previewUrl?.toLowerCase() || "";
  if (previewUrl.includes(".gif")) {
    return true;
  }
  
  return false;
}

/**
 * Analyze uploaded files and return a comprehensive media analysis
 */
export function analyzeMedia(files: UploadedFile[]): MediaAnalysis {
  const totalFiles = files.length;
  
  // Count each type
  let imageCount = 0;
  let videoCount = 0;
  let gifCount = 0;
  
  for (const file of files) {
    if (isGifFile(file)) {
      gifCount++;
    } else if (file.fileType === "video") {
      videoCount++;
    } else if (file.fileType === "image") {
      imageCount++;
    }
  }
  
  // Boolean checks
  const hasImages = imageCount > 0;
  const hasVideos = videoCount > 0;
  const hasGifs = gifCount > 0;
  
  // Specific states
  const isSinglePhoto = imageCount === 1 && videoCount === 0 && gifCount === 0;
  const isMultiplePhotos = imageCount > 1 && videoCount === 0 && gifCount === 0;
  const isSingleVideo = videoCount === 1 && imageCount === 0 && gifCount === 0;
  const isMultipleVideos = videoCount > 1 && imageCount === 0 && gifCount === 0;
  const isSingleGif = gifCount === 1 && imageCount === 0 && videoCount === 0;
  const isMultipleGifs = gifCount > 1 && imageCount === 0 && videoCount === 0;
  
  // Mixed media detection
  const isMixedMedia = hasImages && hasVideos;
  const hasMixedWithGif = hasGifs && (hasImages || hasVideos);
  
  // Text only
  const isTextOnly = totalFiles === 0;
  
  return {
    totalFiles,
    imageCount,
    videoCount,
    gifCount,
    hasImages,
    hasVideos,
    hasGifs,
    isSinglePhoto,
    isMultiplePhotos,
    isSingleVideo,
    isMultipleVideos,
    isSingleGif,
    isMultipleGifs,
    isMixedMedia,
    hasMixedWithGif,
    isTextOnly,
  };
}

/**
 * Get a human-readable description of the media composition
 */
export function getMediaDescription(analysis: MediaAnalysis): string {
  if (analysis.isTextOnly) {
    return "Text only";
  }
  
  const parts: string[] = [];
  
  if (analysis.imageCount > 0) {
    parts.push(`${analysis.imageCount} photo${analysis.imageCount > 1 ? "s" : ""}`);
  }
  
  if (analysis.videoCount > 0) {
    parts.push(`${analysis.videoCount} video${analysis.videoCount > 1 ? "s" : ""}`);
  }
  
  if (analysis.gifCount > 0) {
    parts.push(`${analysis.gifCount} GIF${analysis.gifCount > 1 ? "s" : ""}`);
  }
  
  return parts.join(", ");
}
