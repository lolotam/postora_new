import { MediaCropper } from "./MediaCropper";
import { VideoCompressor } from "./VideoCompressor";
import { Platform } from "@/lib/types";

interface CropperState {
  open: boolean;
  mediaSrc: string;
  mediaType: "image" | "video" | "gif";
  targetRatio: string | null;
  fileId?: string | null;
  mediaFileId?: string | null; // Database ID for Cloudinary processing
}

interface CompressorState {
  open: boolean;
  file: File | null;
  src: string;
  mediaFileId?: string | null; // Database ID for Cloudinary processing
}

interface MediaEditorDialogsProps {
  cropperState: CropperState;
  compressorState: CompressorState;
  selectedPlatforms: Platform[];
  onCloseCropper: () => void;
  onCloseCompressor: () => void;
  onCropComplete: (croppedBlob: Blob, croppedUrl: string, newMediaFileId?: string) => Promise<void>;
  onCompressComplete: (compressedBlob: Blob, compressedUrl: string, newMediaFileId?: string) => Promise<void>;
}

export function MediaEditorDialogs({
  cropperState,
  compressorState,
  selectedPlatforms,
  onCloseCropper,
  onCloseCompressor,
  onCropComplete,
  onCompressComplete,
}: MediaEditorDialogsProps) {
  return (
    <>
      {/* Media Cropper Dialog */}
      <MediaCropper
        open={cropperState.open}
        onOpenChange={onCloseCropper}
        mediaSrc={cropperState.mediaSrc}
        mediaType={cropperState.mediaType}
        targetAspectRatio={cropperState.targetRatio}
        platforms={selectedPlatforms}
        onCropComplete={onCropComplete}
        mediaFileId={cropperState.mediaFileId}
      />

      {/* Video Compressor Dialog */}
      <VideoCompressor
        open={compressorState.open}
        onOpenChange={onCloseCompressor}
        videoFile={compressorState.file}
        videoSrc={compressorState.src}
        mediaFileId={compressorState.mediaFileId || undefined}
        onCompressComplete={onCompressComplete}
      />
    </>
  );
}
