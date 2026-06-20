/**
 * Centralized toast utility functions for consistent notifications across the app.
 * Use these helpers instead of calling toast() directly for standardized behavior.
 */

type ToastFunction = (props: {
  title?: string;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
}) => void;

/**
 * Display a success toast notification
 * @param toast - The toast function from useToast hook
 * @param title - Toast title
 * @param description - Optional description text
 */
export function showSuccessToast(
  toast: ToastFunction,
  title: string,
  description?: string
): void {
  toast({
    title,
    description,
  });
}

/**
 * Display an error toast notification
 * @param toast - The toast function from useToast hook
 * @param title - Toast title
 * @param error - Error message, Error object, or unknown error
 */
export function showErrorToast(
  toast: ToastFunction,
  title: string,
  error?: unknown
): void {
  let description: string | undefined;
  
  if (typeof error === "string") {
    description = error;
  } else if (error instanceof Error) {
    description = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    description = String((error as { message: unknown }).message);
  }

  toast({
    title,
    description,
    variant: "destructive",
  });
}

/**
 * Display a warning toast notification
 * @param toast - The toast function from useToast hook
 * @param title - Toast title
 * @param description - Optional description text
 */
export function showWarningToast(
  toast: ToastFunction,
  title: string,
  description?: string
): void {
  toast({
    title,
    description,
    variant: "destructive",
  });
}

/**
 * Display an info toast notification (same as success but semantically different)
 * @param toast - The toast function from useToast hook
 * @param title - Toast title
 * @param description - Optional description text
 */
export function showInfoToast(
  toast: ToastFunction,
  title: string,
  description?: string
): void {
  toast({
    title,
    description,
  });
}

/**
 * Display a toast with a custom duration
 * @param toast - The toast function from useToast hook
 * @param title - Toast title
 * @param description - Optional description text
 * @param duration - Duration in milliseconds
 * @param variant - Toast variant
 */
export function showToastWithDuration(
  toast: ToastFunction,
  title: string,
  description?: string,
  duration: number = 5000,
  variant: "default" | "destructive" = "default"
): void {
  toast({
    title,
    description,
    duration,
    variant,
  });
}

/**
 * Create a bound toast helper object for use in components
 * This allows you to avoid passing toast to every function call
 * 
 * @example
 * const { toast } = useToast();
 * const notify = createToastHelpers(toast);
 * notify.success("Done!", "Your changes have been saved.");
 * notify.error("Failed", new Error("Something went wrong"));
 */
export function createToastHelpers(toast: ToastFunction) {
  return {
    success: (title: string, description?: string) => 
      showSuccessToast(toast, title, description),
    error: (title: string, error?: unknown) => 
      showErrorToast(toast, title, error),
    warning: (title: string, description?: string) => 
      showWarningToast(toast, title, description),
    info: (title: string, description?: string) => 
      showInfoToast(toast, title, description),
    withDuration: (title: string, description?: string, duration?: number, variant?: "default" | "destructive") =>
      showToastWithDuration(toast, title, description, duration, variant),
  };
}
