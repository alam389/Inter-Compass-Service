import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiting middleware for Gemini API calls
 * Gemini free tier limits: 10 requests per minute
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is within rate limit
   * @param key - Unique identifier (IP, user ID, etc.)
   * @returns { allowed: boolean, resetTime?: number, remaining?: number }
   */
  checkLimit(key: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const record = this.store[key];

    // If no record or window has expired, reset
    if (!record || now >= record.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs
      };
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    // If within limit, increment and allow
    if (record.count < this.maxRequests) {
      record.count++;
      return { allowed: true, remaining: this.maxRequests - record.count };
    }

    // Rate limit exceeded
    return { 
      allowed: false, 
      resetTime: record.resetTime,
      remaining: 0
    };
  }

  /**
   * Get time until reset in seconds
   */
  getTimeUntilReset(key: string): number {
    const record = this.store[key];
    if (!record) return 0;
    
    const now = Date.now();
    const timeLeft = Math.max(0, record.resetTime - now);
    return Math.ceil(timeLeft / 1000);
  }
}

// Create rate limiter instance
const geminiRateLimiter = new RateLimiter(8, 60000); // 8 requests per minute to be safe

/**
 * Express middleware for rate limiting Gemini API requests
 */
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Use IP address or user ID as key
  const key = req.ip || req.connection.remoteAddress || 'anonymous';
  
  const result = geminiRateLimiter.checkLimit(key);
  
  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': '8',
    'X-RateLimit-Remaining': result.remaining?.toString() || '0',
    'X-RateLimit-Reset': result.resetTime ? Math.ceil(result.resetTime / 1000).toString() : '0'
  });

  if (!result.allowed) {
    const retryAfter = geminiRateLimiter.getTimeUntilReset(key);
    res.set('Retry-After', retryAfter.toString());
    
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter: retryAfter
    });
  }

  next();
};

export { geminiRateLimiter };