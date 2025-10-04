import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
        teamId?: number;
        permissions?: string[];
      };
    }
  }
}

/**
 * Mock authentication middleware
 * In production, this would validate JWT tokens or use Auth0
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Mock user for development
    // In production, extract from JWT token or Auth0
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);
    
    // Mock token validation
    // In production, verify JWT with Auth0 or your auth service
    if (token === 'mock-token' || token.length > 10) {
      req.user = {
        id: 'user-123',
        role: 'software-intern',
        teamId: 1,
        permissions: ['read', 'write'],
      };
      next();
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Admin-only middleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user has admin permissions
  if (!req.user.permissions?.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
