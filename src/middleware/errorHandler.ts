import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number = 500): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let { statusCode = 500, message } = error;

  // Log error
  logger.error({
    error: message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  }, 'Error occurred');

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    message = 'Something went wrong';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}
