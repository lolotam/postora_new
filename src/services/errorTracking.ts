// Error tracking service - integrated with Sentry for production monitoring
// Also stores errors locally for debugging

import { Sentry, captureError } from '@/lib/sentry';

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  componentStack?: string;
  additionalContext?: Record<string, unknown>;
}

const MAX_STORED_ERRORS = 50;
const STORAGE_KEY = 'error_reports';

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getStoredErrors(): ErrorReport[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeError(error: ErrorReport): void {
  try {
    const errors = getStoredErrors();
    errors.unshift(error);
    // Keep only the most recent errors
    const trimmed = errors.slice(0, MAX_STORED_ERRORS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to store error report:', e);
  }
}

export function captureException(
  error: Error,
  context?: {
    componentStack?: string;
    userId?: string;
    additionalContext?: Record<string, unknown>;
  }
): string {
  const errorId = generateErrorId();
  
  const report: ErrorReport = {
    id: errorId,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    userId: context?.userId,
    componentStack: context?.componentStack,
    additionalContext: context?.additionalContext,
  };

  // Log to console for development
  console.error('[ErrorTracking] Captured exception:', {
    id: errorId,
    error,
    context,
  });

  // Store locally for debugging
  storeError(report);

  // Send to Sentry
  captureError(error, {
    errorId,
    componentStack: context?.componentStack,
    ...context?.additionalContext,
  });

  // Set Sentry event ID as our error ID for reference
  const sentryEventId = Sentry.lastEventId();

  return sentryEventId || errorId;
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  console.log(`[ErrorTracking] [${level.toUpperCase()}] ${message}`, context);
  
  // Send to Sentry
  Sentry.captureMessage(message, {
    level: level === 'warning' ? 'warning' : level,
    extra: context,
  });
}

export function setUser(userId: string | null, email?: string): void {
  // Store current user for error context
  if (userId) {
    sessionStorage.setItem('error_tracking_user', userId);
    Sentry.setUser({ id: userId, email });
  } else {
    sessionStorage.removeItem('error_tracking_user');
    Sentry.setUser(null);
  }
}

export function getStoredErrorReports(): ErrorReport[] {
  return getStoredErrors();
}

export function clearStoredErrors(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Initialize global error handlers
// Note: Sentry automatically captures unhandled errors/rejections
// This provides additional local logging
export function initErrorTracking(): void {
  // Catch unhandled errors - log locally (Sentry handles these automatically)
  window.addEventListener('error', (event) => {
    // Store locally for debugging
    const error = event.error || new Error(event.message);
    const errorId = generateErrorId();
    storeError({
      id: errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalContext: {
        type: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Catch unhandled promise rejections - log locally (Sentry handles these automatically)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    const errorId = generateErrorId();
    storeError({
      id: errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalContext: {
        type: 'unhandled_rejection',
      },
    });
  });

  console.log('[ErrorTracking] Initialized global error handlers (Sentry active)');
}
