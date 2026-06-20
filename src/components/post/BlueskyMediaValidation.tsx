import { AlertCircle, CheckCircle2, Image, Video, FileWarning } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MediaFile {
  previewUrl: string;
  fileType: "image" | "video";
  mimeType?: string;
  size?: number;
}

interface BlueskyMediaValidationProps {
  files: MediaFile[];
  className?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Bluesky media specifications
const BLUESKY_SPECS = {
  maxImages: 4,
  maxVideoSize: 50 * 1024 * 1024, // 50MB
  maxImageSize: 1 * 1024 * 1024, // 1MB (recommended), actual limit is higher
  supportedImageFormats: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  supportedVideoFormats: ["video/mp4", "video/webm"],
  maxVideoDuration: 60, // seconds
  maxImageDimension: 2000, // recommended pixels
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateBlueskyMedia(files: MediaFile[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) {
    return { valid: true, errors: [], warnings: [] };
  }

  const images = files.filter(f => f.fileType === "image");
  const videos = files.filter(f => f.fileType === "video");

  // Check: Can't mix video with images
  if (videos.length > 0 && images.length > 0) {
    errors.push("Bluesky doesn't support mixing videos and images in a single post. Remove either the video or images.");
  }

  // Check: Max 4 images
  if (images.length > BLUESKY_SPECS.maxImages) {
    errors.push(`Bluesky allows max ${BLUESKY_SPECS.maxImages} images. You have ${images.length}. Remove ${images.length - BLUESKY_SPECS.maxImages} image(s).`);
  }

  // Check: Only 1 video allowed
  if (videos.length > 1) {
    errors.push(`Bluesky allows only 1 video per post. You have ${videos.length}. Remove ${videos.length - 1} video(s).`);
  }

  // Validate image formats
  for (const img of images) {
    if (img.mimeType && !BLUESKY_SPECS.supportedImageFormats.includes(img.mimeType)) {
      errors.push(`Unsupported image format: ${img.mimeType}. Use JPEG, PNG, GIF, or WebP.`);
    }
    if (img.size && img.size > BLUESKY_SPECS.maxImageSize) {
      warnings.push(`Image (${formatSize(img.size)}) exceeds recommended 1MB. It may be compressed.`);
    }
  }

  // Validate video formats
  for (const vid of videos) {
    if (vid.mimeType && !BLUESKY_SPECS.supportedVideoFormats.includes(vid.mimeType)) {
      errors.push(`Unsupported video format: ${vid.mimeType}. Use MP4 or WebM.`);
    }
    if (vid.size && vid.size > BLUESKY_SPECS.maxVideoSize) {
      errors.push(`Video (${formatSize(vid.size)}) exceeds ${formatSize(BLUESKY_SPECS.maxVideoSize)} limit.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function BlueskyMediaValidation({ files, className }: BlueskyMediaValidationProps) {
  const validation = validateBlueskyMedia(files);

  if (files.length === 0) {
    return null;
  }

  const images = files.filter(f => f.fileType === "image");
  const videos = files.filter(f => f.fileType === "video");

  return (
    <div className={className}>
      {/* Status summary */}
      <div className="flex items-center gap-2 text-sm mb-2">
        {validation.valid ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-destructive" />
        )}
        <span className="text-muted-foreground">
          {images.length > 0 && (
            <span className="inline-flex items-center gap-1 mr-2">
              <Image className="w-3 h-3" />
              {images.length}/{BLUESKY_SPECS.maxImages} images
            </span>
          )}
          {videos.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Video className="w-3 h-3" />
              {videos.length}/1 video
            </span>
          )}
        </span>
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive" className="mb-2">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Bluesky Media Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {validation.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
