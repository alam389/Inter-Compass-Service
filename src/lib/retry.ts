/**
 * Utility functions for handling API retries and exponential backoff
 */

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate delay for exponential backoff
 */
export const calculateBackoffDelay = (
  attempt: number, 
  baseDelay: number = 1000, 
  backoffFactor: number = 2, 
  maxDelay: number = 30000
): number => {
  const delay = baseDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
};

/**
 * Default retry condition - retry on rate limit and server errors
 */
export const defaultRetryCondition = (error: any): boolean => {
  if (!error) return false;
  
  // Retry on rate limit errors (429)
  if (error.status === 429) return true;
  
  // Retry on server errors (5xx)
  if (error.status >= 500) return true;
  
  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') return true;
  
  // Don't retry on client errors (4xx except 429)
  return false;
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition
  } = config;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry if condition is not met
      if (!retryCondition(error)) {
        break;
      }
      
      // Calculate delay
      let delay = calculateBackoffDelay(attempt, baseDelay, backoffFactor, maxDelay);
      
      // If error has retry delay info (like from Gemini), use that
      if (error.errorDetails) {
        const retryInfo = error.errorDetails.find((detail: any) => 
          detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        );
        if (retryInfo?.retryDelay) {
          // Parse delay from string like "54s"
          const retrySeconds = parseInt(retryInfo.retryDelay.replace('s', ''));
          if (!isNaN(retrySeconds)) {
            delay = Math.min(retrySeconds * 1000, maxDelay);
          }
        }
      }
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Parse rate limit error to extract retry delay
 */
export const parseRateLimitError = (error: any): { retryAfter: number; quotaType: string } => {
  const defaultRetry = { retryAfter: 60, quotaType: 'unknown' };
  
  if (!error.errorDetails) return defaultRetry;
  
  // Look for retry info
  const retryInfo = error.errorDetails.find((detail: any) => 
    detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
  );
  
  // Look for quota failure info
  const quotaFailure = error.errorDetails.find((detail: any) => 
    detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure'
  );
  
  let retryAfter = 60;
  if (retryInfo?.retryDelay) {
    const retrySeconds = parseInt(retryInfo.retryDelay.replace('s', ''));
    if (!isNaN(retrySeconds)) {
      retryAfter = retrySeconds;
    }
  }
  
  let quotaType = 'unknown';
  if (quotaFailure?.violations?.[0]?.quotaMetric) {
    quotaType = quotaFailure.violations[0].quotaMetric;
  }
  
  return { retryAfter, quotaType };
};