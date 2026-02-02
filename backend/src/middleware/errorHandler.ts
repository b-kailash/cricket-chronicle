import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Custom error class for application errors
 */
export class ApiError extends Error implements AppError {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): ApiError {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN'): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(message: string, code = 'CONFLICT', details?: unknown): ApiError {
    return new ApiError(409, code, message, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR'): ApiError {
    return new ApiError(500, code, message);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log the error
  console.error(`[Error] ${err.code || 'UNKNOWN'}: ${err.message}`);
  if (config.nodeEnv === 'development') {
    console.error(err.stack);
  }

  // Default values
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Build response
  const response: {
    success: false;
    error: {
      code: string;
      message: string;
      details?: unknown;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      code,
      message,
    },
  };

  // Include details if present
  if (err.details) {
    response.error.details = err.details;
  }

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
