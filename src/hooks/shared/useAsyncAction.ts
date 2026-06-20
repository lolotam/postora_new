import { useState, useCallback } from "react";

interface UseAsyncActionOptions<T> {
  /** Callback on success */
  onSuccess?: (result: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback when action completes (success or error) */
  onSettled?: () => void;
}

interface UseAsyncActionReturn<T, Args extends unknown[]> {
  /** Whether the action is currently loading */
  isLoading: boolean;
  /** Error from the last execution (null if none) */
  error: Error | null;
  /** Result from the last successful execution */
  data: T | null;
  /** Execute the async action */
  execute: (...args: Args) => Promise<T | null>;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for handling async actions with loading/error states
 * 
 * @example
 * const { isLoading, error, execute } = useAsyncAction(
 *   async (postId: string) => {
 *     const response = await fetch(`/api/posts/${postId}`);
 *     return response.json();
 *   },
 *   {
 *     onSuccess: (data) => toast({ title: "Post loaded!" }),
 *     onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
 *   }
 * );
 * 
 * return (
 *   <Button onClick={() => execute("123")} disabled={isLoading}>
 *     {isLoading ? "Loading..." : "Load Post"}
 *   </Button>
 * );
 */
export function useAsyncAction<T, Args extends unknown[] = []>(
  action: (...args: Args) => Promise<T>,
  options: UseAsyncActionOptions<T> = {}
): UseAsyncActionReturn<T, Args> {
  const { onSuccess, onError, onSettled } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action(...args);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
        onSettled?.();
      }
    },
    [action, onSuccess, onError, onSettled]
  );

  return { isLoading, error, data, execute, reset };
}
