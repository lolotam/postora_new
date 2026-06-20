export interface ImageToolsFile {
  id: string;
  publicUrl: string;
  cloudinary_public_id?: string;
  storage_bucket: string;
  folder_path?: string;
  file_path: string;
}

export interface ImageToolsDialogProps {
  open: boolean;
  onClose: () => void;
  file: ImageToolsFile | null;
  cloudName: string;
  onProcessComplete?: () => void;
}

export type EdgeMode = "none" | "fine";
export type ResizeMode = "original" | "square" | "portrait" | "landscape" | "custom";
export type CropMode = "fill" | "fit" | "scale" | "crop" | "pad";
export type ArtisticFilter = 
  | "none" 
  | "al_dente" 
  | "athena" 
  | "audrey" 
  | "aurora" 
  | "daguerre" 
  | "eucalyptus" 
  | "fes" 
  | "frost" 
  | "hairspray" 
  | "hokusai" 
  | "incognito" 
  | "linen" 
  | "peacock" 
  | "primavera" 
  | "quartz" 
  | "red_rock" 
  | "refresh" 
  | "sizzle" 
  | "sonnet" 
  | "ukulele" 
  | "zorro";

export type UpscaleMode = "standard" | "enhance" | "restore";
export type UpscalePlatform = "cloudinary" | "atlascloud";
export type QualityPreset = "auto" | "best" | "high" | "medium" | "low" | "eco";
export type OutputFormat = "auto" | "jpg" | "png" | "webp";

export interface TempCloudinaryData {
  publicId: string;
  cloudName: string;
  url: string;
}

export interface CropOverlayInfo {
  cropLeft: number;
  cropTop: number;
  cropWidth: number;
  cropHeight: number;
  imageLeft: number;
  imageTop: number;
  displayedImageWidth: number;
  displayedImageHeight: number;
  isCropMode: boolean;
}

export interface ImageToolsState {
  // Processing states
  processing: boolean;
  uploading: boolean;
  processedUrl: string | null;
  comparePosition: number;
  saving: boolean;
  
  // Feature toggles
  enableBgRemoval: boolean;
  enableResize: boolean;
  enableUpscale: boolean;
  enableFilters: boolean;
  enableQuality: boolean;
  
  // Background removal options
  edgeMode: EdgeMode;
  
  // Resize options
  resizeMode: ResizeMode;
  cropMode: CropMode;
  customWidth: number;
  customHeight: number;
  
  // Filter options
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpening: number;
  noiseReduction: number;
  artisticFilter: ArtisticFilter;
  
  // Upscale options
  upscaleMode: UpscaleMode;
  
  // Quality options
  qualityPreset: QualityPreset;
  customQuality: number;
  outputFormat: OutputFormat;
  
  // Preview state
  tempCloudinaryData: TempCloudinaryData | null;
  livePreviewUrl: string | null;
  previewLoading: boolean;
  containerDimensions: { width: number; height: number };
  imageDimensions: { width: number; height: number };
}
