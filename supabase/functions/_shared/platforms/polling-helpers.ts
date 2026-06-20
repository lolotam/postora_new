/**
 * Shared polling helper functions for platform handlers
 * These utilities handle async status checking with retry logic
 */

export interface PollingOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  backoffMultiplier?: number;
  maxDelay?: number;
}

export interface PollingResult<T> {
  done: boolean;
  result?: T;
  error?: string;
}

/**
 * Generic polling function with configurable retry logic
 * 
 * @param checkFn - Function that returns polling result
 * @param options - Polling configuration options
 * @returns The result when done=true
 * @throws Error if polling times out or checkFn returns error
 * 
 * @example
 * const result = await pollWithRetry(async () => {
 *   const status = await checkStatus();
 *   if (status === 'complete') {
 *     return { done: true, result: status };
 *   }
 *   if (status === 'failed') {
 *     return { done: true, error: 'Processing failed' };
 *   }
 *   return { done: false };
 * }, { maxAttempts: 30, delayMs: 2000 });
 */
export async function pollWithRetry<T>(
  checkFn: () => Promise<PollingResult<T>>,
  options: PollingOptions = {}
): Promise<T> {
  const {
    maxAttempts = 30,
    delayMs = 2000,
    backoff = false,
    backoffMultiplier = 1.5,
    maxDelay = 30000,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { done, result, error } = await checkFn();

    if (error) {
      throw new Error(error);
    }

    if (done && result !== undefined) {
      return result;
    }

    // Calculate delay with optional exponential backoff
    let delay = delayMs;
    if (backoff) {
      delay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt), maxDelay);
    }
    
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}

/**
 * Wait for a condition to be true with timeout
 * 
 * @param conditionFn - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait
 * @param checkIntervalMs - How often to check the condition
 * @returns true if condition was met, false if timed out
 */
export async function waitForCondition(
  conditionFn: () => Promise<boolean> | boolean,
  timeoutMs: number = 30000,
  checkIntervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }
  
  return false;
}

/**
 * Simple delay function
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with configurable attempts and delay
 * 
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of successful function call
 * @throws Last error if all retries failed
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries - 1 || !shouldRetry(lastError)) {
        throw lastError;
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}
