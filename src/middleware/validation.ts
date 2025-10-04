import { Request, Response, NextFunction } from 'express';

/**
 * Validation Middleware
 * Provides request validation utilities
 */

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

/**
 * Validate request body against rules
 */
export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check if required field is missing
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
          continue;
        }
      }

      // String validations
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters long`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`Field '${rule.field}' must be no more than ${rule.maxLength} characters long`);
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field '${rule.field}' must be no more than ${rule.max}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Simple in-memory rate limiter
 * For production, use Redis or a proper rate limiting service
 */
class SimpleRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // New window or expired window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true };
    }

    if (record.count >= this.maxRequests) {
      return { 
        allowed: false, 
        resetTime: record.resetTime 
      };
    }

    record.count++;
    return { allowed: true };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Create rate limiter instances
const globalLimiter = new SimpleRateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes
const aiLimiter = new SimpleRateLimiter(50, 60 * 1000); // 50 AI requests per minute

// Cleanup old entries periodically
setInterval(() => {
  globalLimiter.cleanup();
  aiLimiter.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Rate limiting middleware
 */
export function rateLimit(limiter?: SimpleRateLimiter) {
  const activeLimiter = limiter || globalLimiter;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const result = activeLimiter.isAllowed(identifier);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime || Date.now());
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later',
        resetTime: resetDate.toISOString()
      });
    }

    next();
  };
}

/**
 * AI-specific rate limiting (more restrictive)
 */
export const aiRateLimit = rateLimit(aiLimiter);

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url, ip } = req;
  
  console.log(`📥 ${method} ${url} - ${ip || 'unknown'}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const statusEmoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    
    console.log(`📤 ${statusEmoji} ${method} ${url} - ${statusCode} - ${duration}ms`);
  });
  
  next();
}

/**
 * Error handling middleware for async routes
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}