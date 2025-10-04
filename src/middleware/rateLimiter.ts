import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  keyGenerator: (req) => req.ip || 'unknown',
};

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:${finalConfig.keyGenerator!(req)}`;
      const redis = getRedis();
      
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(finalConfig.windowMs / 1000));
      }
      
      if (current > finalConfig.maxRequests) {
        logger.warn(`Rate limit exceeded for ${req.ip}`);
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(finalConfig.windowMs / 1000),
        });
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, finalConfig.maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + finalConfig.windowMs).toISOString(),
      });
      
      return next();
    } catch (error) {
      logger.error({ error }, 'Rate limiter error');
      // If Redis is down, allow the request
      return next();
    }
  };
}

// Default rate limiter
export const rateLimiter = createRateLimiter();

// Stricter rate limiter for chat endpoints
export const chatRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // 20 requests per 5 minutes
});

// Stricter rate limiter for outline generation
export const outlineRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10, // 10 requests per 10 minutes
});
