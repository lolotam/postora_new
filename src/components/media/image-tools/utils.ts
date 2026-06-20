import { CropMode, CropOverlayInfo, ArtisticFilter, ResizeMode, UpscaleMode, QualityPreset, OutputFormat } from "./types";
import { RESIZE_PRESETS, QUALITY_PRESETS } from "./constants";

/**
 * Calculate crop overlay dimensions and position relative to displayed image
 */
export function getCropOverlayInfo(
  containerWidth: number,
  containerHeight: number,
  targetWidth: number,
  targetHeight: number,
  imageWidth: number,
  imageHeight: number,
  cropMode: CropMode
): CropOverlayInfo {
  const targetAspect = targetWidth / targetHeight;
  const imageAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;
  
  // Calculate how the image is displayed in the container (object-contain)
  let displayedImageWidth: number;
  let displayedImageHeight: number;
  
  if (imageAspect > containerAspect) {
    displayedImageWidth = containerWidth;
    displayedImageHeight = containerWidth / imageAspect;
  } else {
    displayedImageHeight = containerHeight;
    displayedImageWidth = containerHeight * imageAspect;
  }
  
  // Calculate image position (centered in container)
  const imageLeft = (containerWidth - displayedImageWidth) / 2;
  const imageTop = (containerHeight - displayedImageHeight) / 2;
  
  // Calculate the crop area dimensions (as percentages of displayed image)
  let cropWidthPercent: number;
  let cropHeightPercent: number;
  
  if (cropMode === "fill" || cropMode === "crop") {
    // For fill/crop, show what portion will be kept (cropped to fit target ratio)
    if (targetAspect > imageAspect) {
      // Target is wider than image - full width, reduce height
      cropWidthPercent = 100;
      cropHeightPercent = (imageAspect / targetAspect) * 100;
    } else {
      // Target is taller than image - full height, reduce width
      cropHeightPercent = 100;
      cropWidthPercent = (targetAspect / imageAspect) * 100;
    }
  } else if (cropMode === "fit" || cropMode === "pad") {
    // For fit/pad, show the full image will be preserved (with padding if needed)
    cropWidthPercent = 100;
    cropHeightPercent = 100;
  } else {
    // Scale - image will be distorted to fit exactly
    cropWidthPercent = 100;
    cropHeightPercent = 100;
  }
  
  // Calculate actual pixel dimensions for the overlay
  const cropWidth = (cropWidthPercent / 100) * displayedImageWidth;
  const cropHeight = (cropHeightPercent / 100) * displayedImageHeight;
  
  // Center the crop area within the displayed image
  const cropLeft = imageLeft + (displayedImageWidth - cropWidth) / 2;
  const cropTop = imageTop + (displayedImageHeight - cropHeight) / 2;
  
  return { 
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    imageLeft,
    imageTop,
    displayedImageWidth,
    displayedImageHeight,
    isCropMode: cropMode === "fill" || cropMode === "crop"
  };
}

interface BuildUrlOptions {
  enableBgRemoval: boolean;
  enableResize: boolean;
  enableUpscale: boolean;
  enableFilters: boolean;
  enableQuality: boolean;
  edgeMode: "none" | "fine";
  resizeMode: ResizeMode;
  cropMode: CropMode;
  customWidth: number;
  customHeight: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpening: number;
  noiseReduction: number;
  artisticFilter: ArtisticFilter;
  upscaleMode: UpscaleMode;
  qualityPreset: QualityPreset;
  outputFormat: OutputFormat;
}

/**
 * Check if any filter is modified
 */
export function hasFilterModifications(
  brightness: number,
  contrast: number,
  saturation: number,
  blur: number,
  sharpening: number,
  noiseReduction: number,
  artisticFilter: ArtisticFilter
): boolean {
  return brightness !== 0 || contrast !== 0 || saturation !== 0 || blur > 0 || sharpening > 0 || noiseReduction > 0 || artisticFilter !== "none";
}

/**
 * Build a Cloudinary transformation URL
 */
export function buildCloudinaryUrl(
  publicId: string,
  targetCloudName: string,
  options: BuildUrlOptions
): string {
  const transformations: string[] = [];
  const filterModified = hasFilterModifications(
    options.brightness,
    options.contrast,
    options.saturation,
    options.blur,
    options.sharpening,
    options.noiseReduction,
    options.artisticFilter
  );

  // Add resize FIRST (order matters in Cloudinary)
  if (options.enableResize && options.resizeMode !== "original") {
    const preset = RESIZE_PRESETS[options.resizeMode];
    let width = preset.width;
    let height = preset.height;

    if (options.resizeMode === "custom") {
      width = options.customWidth;
      height = options.customHeight;
    }

    if (width && height) {
      transformations.push(`w_${width},h_${height},c_${options.cropMode}`);
    }
  }

  // Add background removal
  if (options.enableBgRemoval) {
    if (options.edgeMode === "fine") {
      transformations.push("e_background_removal:fineedges_y");
    } else {
      transformations.push("e_background_removal");
    }
  }
  
  // Add upscale - use standard scaling with quality enhancement
  // Note: e_upscale requires Cloudinary Plus plan, so we use c_scale with improve/sharpen
  if (options.enableUpscale) {
    // Apply 2x scaling with quality enhancement
    transformations.push("c_scale,w_2.0,h_2.0");
    
    if (options.upscaleMode === "enhance") {
      transformations.push("e_improve");
      transformations.push("e_sharpen:100");
    } else if (options.upscaleMode === "restore") {
      transformations.push("e_improve:indoor");
      transformations.push("e_sharpen:80");
    } else {
      // Standard mode - just sharpen slightly
      transformations.push("e_sharpen:60");
    }
  }
  
  // Add filters and effects
  if (options.enableFilters && filterModified) {
    const filterParts: string[] = [];
    
    if (options.brightness !== 0) {
      filterParts.push(`e_brightness:${options.brightness}`);
    }
    if (options.contrast !== 0) {
      filterParts.push(`e_contrast:${options.contrast}`);
    }
    if (options.saturation !== 0) {
      filterParts.push(`e_saturation:${options.saturation}`);
    }
    if (options.blur > 0) {
      filterParts.push(`e_blur:${options.blur * 10}`);
    }
    if (options.sharpening > 0) {
      filterParts.push(`e_sharpen:${Math.round(options.sharpening * 10)}`);
    }
    if (options.noiseReduction > 0) {
      filterParts.push(`e_improve:indoor:${Math.round(options.noiseReduction)}`);
    }
    if (options.artisticFilter !== "none") {
      filterParts.push(`e_art:${options.artisticFilter}`);
    }
    
    if (filterParts.length > 0) {
      transformations.push(filterParts.join(","));
    }
  }
  
  // Add quality settings
  if (options.enableQuality) {
    const qualityParts: string[] = [];
    
    if (options.qualityPreset === "auto") {
      qualityParts.push("q_auto");
    } else {
      qualityParts.push(`q_${QUALITY_PRESETS[options.qualityPreset].value}`);
    }
    
    if (options.outputFormat !== "auto") {
      qualityParts.push(`f_${options.outputFormat}`);
    } else {
      qualityParts.push("f_auto");
    }
    
    if (qualityParts.length > 0) {
      transformations.push(qualityParts.join(","));
    }
  }

  const transformString = transformations.join("/");
  return `https://res.cloudinary.com/${targetCloudName}/image/upload/${transformString}/${publicId}`;
}

/**
 * Build a filter preview URL (optimized for speed with lower quality)
 */
export function buildFilterPreviewUrl(
  publicId: string,
  targetCloudName: string,
  options: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sharpening: number;
    noiseReduction: number;
    artisticFilter: ArtisticFilter;
  }
): string | null {
  const transformations: string[] = [];
  
  // Add low quality + small size for faster preview
  transformations.push("q_auto:low,w_800");
  
  const filterParts: string[] = [];
  
  if (options.brightness !== 0) {
    filterParts.push(`e_brightness:${options.brightness}`);
  }
  if (options.contrast !== 0) {
    filterParts.push(`e_contrast:${options.contrast}`);
  }
  if (options.saturation !== 0) {
    filterParts.push(`e_saturation:${options.saturation}`);
  }
  if (options.blur > 0) {
    filterParts.push(`e_blur:${options.blur * 10}`);
  }
  if (options.sharpening > 0) {
    filterParts.push(`e_sharpen:${Math.round(options.sharpening * 10)}`);
  }
  if (options.noiseReduction > 0) {
    filterParts.push(`e_improve:indoor:${Math.round(options.noiseReduction)}`);
  }
  if (options.artisticFilter !== "none") {
    filterParts.push(`e_art:${options.artisticFilter}`);
  }
  
  if (filterParts.length === 0) return null;
  
  transformations.push(filterParts.join(","));
  
  const transformString = transformations.join("/");
  return `https://res.cloudinary.com/${targetCloudName}/image/upload/${transformString}/${publicId}`;
}

/**
 * Generate cache key for current filter settings
 */
export function getFilterCacheKey(
  brightness: number,
  contrast: number,
  saturation: number,
  blur: number,
  sharpening: number,
  noiseReduction: number,
  artisticFilter: ArtisticFilter
): string {
  return `${brightness}-${contrast}-${saturation}-${blur}-${sharpening}-${noiseReduction}-${artisticFilter}`;
}

/**
 * Get target dimensions for resize
 */
export function getTargetDimensions(
  enableResize: boolean,
  resizeMode: ResizeMode,
  customWidth: number,
  customHeight: number
): { width: number; height: number } | null {
  if (!enableResize || resizeMode === "original") {
    return null;
  }
  
  const preset = RESIZE_PRESETS[resizeMode];
  if (resizeMode === "custom") {
    return { width: customWidth, height: customHeight };
  }
  
  if (preset.width && preset.height) {
    return { width: preset.width, height: preset.height };
  }
  
  return null;
}
