import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import {
  ConcurrencyConflictError,
  IdempotencyKeyConflictError,
  CommandValidationError,
} from '../event-sourcing/types';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    [key: string]: any;
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle specific error types
  if (err instanceof ConcurrencyConflictError) {
    const response: ErrorResponse = {
      error: {
        code: 'CONCURRENCY_CONFLICT',
        message: err.message,
        expected_version: err.expectedVersion,
        current_version: err.actualVersion,
        aggregate_id: err.aggregateId,
        retry_strategy: 'reload_and_retry',
      },
    };

    res.status(409).json(response);
    return;
  }

  if (err instanceof IdempotencyKeyConflictError) {
    // Not an error - return original result with 200 OK
    res.status(200).json(err.originalResult);
    return;
  }

  if (err instanceof CommandValidationError) {
    const response: ErrorResponse = {
      error: {
        code: 'COMMAND_VALIDATION_ERROR',
        message: 'Invalid command payload',
        validation_errors: err.validationErrors,
      },
    };

    res.status(422).json(response);
    return;
  }

  // Database constraint violations
  if ((err as any).code === '23505') {
    // Unique constraint violation
    const response: ErrorResponse = {
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
        details: (err as any).detail || err.message,
      },
    };

    res.status(409).json(response);
    return;
  }

  if ((err as any).code === '23503') {
    // Foreign key constraint violation
    const response: ErrorResponse = {
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
        details: (err as any).detail || err.message,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Generic error
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  res.status(500).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };

  res.status(404).json(response);
}

/**
 * Request logging middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      user_agent: req.get('user-agent'),
      ip: req.ip,
    });
  });

  next();
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
