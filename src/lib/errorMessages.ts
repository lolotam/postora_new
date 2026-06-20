/**
 * User-friendly error messages for common API errors
 * Maps technical errors to actionable user guidance
 */

export interface ParsedError {
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
  isRetryable: boolean;
}

/**
 * Parse API/Edge function errors into user-friendly messages
 */
export function parseApiError(error: unknown, context?: string): ParsedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerError = errorMessage.toLowerCase();

  // AtlasCloud specific errors
  if (lowerError.includes('402') || lowerError.includes('insufficient balance') || lowerError.includes('insufficient_balance')) {
    return {
      title: "AtlasCloud Credits Exhausted",
      description: "Your AtlasCloud account has run out of credits. Please add funds to continue using 4K upscaling.",
      action: "Use Cloudinary instead",
      isRetryable: false,
    };
  }

  if (lowerError.includes('atlascloud') && lowerError.includes('timeout')) {
    return {
      title: "Upscale Taking Too Long",
      description: "The 4K upscaling is taking longer than expected. This can happen with very large images.",
      action: "Try with Cloudinary",
      isRetryable: true,
    };
  }

  // Cloudinary specific errors
  if (lowerError.includes('cloudinary') && lowerError.includes('400')) {
    return {
      title: "Image Processing Failed",
      description: "The image transformation couldn't be applied. This may be due to an unsupported format or corrupted file.",
      action: "Try a different image",
      isRetryable: false,
    };
  }

  if (lowerError.includes('e_upscale') || (lowerError.includes('cloudinary') && lowerError.includes('transformation'))) {
    return {
      title: "Upscale Feature Unavailable",
      description: "Advanced AI upscaling requires a Cloudinary Plus plan. Standard enhancement has been applied instead.",
      isRetryable: false,
    };
  }

  // Authentication errors
  if (lowerError.includes('401') || lowerError.includes('unauthorized') || lowerError.includes('invalid api key')) {
    return {
      title: "Authentication Failed",
      description: "Your session may have expired. Please refresh the page or log in again.",
      action: "Refresh page",
      isRetryable: false,
    };
  }

  if (lowerError.includes('403') || lowerError.includes('forbidden')) {
    return {
      title: "Access Denied",
      description: "You don't have permission to perform this action. Please check your account status.",
      isRetryable: false,
    };
  }

  // Rate limiting
  if (lowerError.includes('429') || lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
    return {
      title: "Too Many Requests",
      description: "You've made too many requests. Please wait a moment before trying again.",
      isRetryable: true,
    };
  }

  // Network errors
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return {
      title: "Connection Error",
      description: "Unable to reach the server. Please check your internet connection and try again.",
      isRetryable: true,
    };
  }

  // Timeout errors
  if (lowerError.includes('timeout') || lowerError.includes('504') || lowerError.includes('timed out')) {
    return {
      title: "Request Timed Out",
      description: "The operation took too long to complete. This might be due to a large file or server load.",
      isRetryable: true,
    };
  }

  // File/Media errors
  if (lowerError.includes('file too large') || lowerError.includes('size limit')) {
    return {
      title: "File Too Large",
      description: "The file exceeds the maximum size limit. Please compress or resize it before uploading.",
      isRetryable: false,
    };
  }

  if (lowerError.includes('unsupported') || lowerError.includes('format')) {
    return {
      title: "Unsupported Format",
      description: "This file format is not supported. Please use a standard image format (JPG, PNG, WebP).",
      isRetryable: false,
    };
  }

  if (lowerError.includes('not found') || lowerError.includes('404')) {
    return {
      title: "Resource Not Found",
      description: context === "image" 
        ? "The image could not be found. It may have been deleted or moved."
        : "The requested resource could not be found.",
      isRetryable: false,
    };
  }

  // Server errors
  if (lowerError.includes('500') || lowerError.includes('internal server error')) {
    return {
      title: "Server Error",
      description: "Something went wrong on our end. Our team has been notified. Please try again later.",
      isRetryable: true,
    };
  }

  if (lowerError.includes('503') || lowerError.includes('service unavailable')) {
    return {
      title: "Service Temporarily Unavailable",
      description: "The service is currently undergoing maintenance. Please try again in a few minutes.",
      isRetryable: true,
    };
  }

  // Configuration errors
  if (lowerError.includes('configuration') || lowerError.includes('not configured')) {
    return {
      title: "Service Not Configured",
      description: "This feature is not properly configured. Please contact support if this persists.",
      isRetryable: false,
    };
  }

  // Token/OAuth errors
  if (lowerError.includes('token') && (lowerError.includes('expired') || lowerError.includes('invalid'))) {
    return {
      title: "Session Expired",
      description: "Your authentication token has expired. Please reconnect your account.",
      action: "Go to Connection Health",
      actionUrl: "/connection-health",
      isRetryable: false,
    };
  }

  // Default fallback
  return {
    title: context ? `${context} Failed` : "Operation Failed",
    description: errorMessage.length > 100 
      ? `${errorMessage.substring(0, 100)}...` 
      : errorMessage || "An unexpected error occurred. Please try again.",
    isRetryable: true,
  };
}

/**
 * Get a short, user-friendly error message for toasts
 */
export function getToastError(error: unknown, context?: string): { title: string; description: string } {
  const parsed = parseApiError(error, context);
  return {
    title: parsed.title,
    description: parsed.description,
  };
}
