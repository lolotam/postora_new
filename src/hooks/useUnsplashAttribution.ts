import { useEffect, useCallback, useMemo } from "react";
import {
  UnsplashAttributionData,
  getRequiredAttribution,
  hasValidAttribution,
  appendAttribution,
  validateCaptionAttribution,
} from "@/lib/unsplashAttribution";
import type { UploadedFile } from "@/hooks/usePostForm";

interface UseUnsplashAttributionOptions {
  files: UploadedFile[];
  caption: string;
  setCaption: (caption: string | ((prev: string) => string)) => void;
  /** If true, auto-appends attribution when Unsplash images are added */
  autoAppend?: boolean;
}

interface UseUnsplashAttributionReturn {
  /** The required attribution data, if any Unsplash images are present */
  requiredAttribution: UnsplashAttributionData | null;
  /** Whether the current caption has valid attribution */
  isAttributionValid: boolean;
  /** Validation error message, or null if valid */
  validationError: string | null;
  /** Manually append attribution to caption */
  addAttribution: () => void;
  /** Check if any Unsplash images are present */
  hasUnsplashImages: boolean;
}

/**
 * Hook to manage Unsplash attribution requirements for post captions.
 * 
 * When Unsplash images are selected:
 * - Automatically appends attribution to caption (if autoAppend is true)
 * - Tracks whether attribution is present
 * - Provides validation state for form submission
 */
export function useUnsplashAttribution({
  files,
  caption,
  setCaption,
  autoAppend = true,
}: UseUnsplashAttributionOptions): UseUnsplashAttributionReturn {
  
  // Check for Unsplash images and get attribution data
  const requiredAttribution = useMemo(
    () => getRequiredAttribution(files),
    [files]
  );
  
  const hasUnsplashImages = requiredAttribution !== null;
  
  // Check if current caption has valid attribution
  const isAttributionValid = useMemo(() => {
    if (!requiredAttribution) return true;
    return hasValidAttribution(caption, requiredAttribution.photographerName);
  }, [caption, requiredAttribution]);
  
  // Get validation error message
  const validationError = useMemo(
    () => validateCaptionAttribution(caption, files),
    [caption, files]
  );
  
  // Function to manually add attribution
  const addAttribution = useCallback(() => {
    if (!requiredAttribution) return;
    setCaption(prev => appendAttribution(prev, requiredAttribution.photographerName));
  }, [requiredAttribution, setCaption]);
  
  // Auto-append attribution when Unsplash images are added
  useEffect(() => {
    if (!autoAppend || !requiredAttribution) return;
    
    // Only auto-append if attribution is missing
    if (!hasValidAttribution(caption, requiredAttribution.photographerName)) {
      // Use a small delay to avoid race conditions with other caption updates
      const timer = setTimeout(() => {
        setCaption(prev => {
          // Double-check attribution is still needed
          if (!hasValidAttribution(prev, requiredAttribution.photographerName)) {
            return appendAttribution(prev, requiredAttribution.photographerName);
          }
          return prev;
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [requiredAttribution?.photographerName, autoAppend]); // Only depend on photographer name change
  
  return {
    requiredAttribution,
    isAttributionValid,
    validationError,
    addAttribution,
    hasUnsplashImages,
  };
}
