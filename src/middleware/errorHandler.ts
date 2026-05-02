import { Request, Response, NextFunction } from 'express';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ProxyError extends Error implements ApiError {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ProxyError.prototype);
  }
}

/**
 * Centralized error handling middleware
 * Returns errors in Claude API format
 */
export function errorHandler(
  err: Error | ProxyError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === 'development';

  let status = 500;
  let code = 'internal_error';
  let message = 'An internal server error occurred';
  let details: Record<string, unknown> = {};

  if (err instanceof ProxyError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details || {};
  } else if (err instanceof SyntaxError) {
    status = 400;
    code = 'invalid_request_format';
    message = 'Invalid request format';
  }

  if (isDev) {
    console.error('Error:', {
      status,
      code,
      message,
      stack: err.stack,
      details,
    });
  }

  // Return error in Claude API format
  res.status(status).json({
    type: 'error',
    error: {
      type: code,
      message,
      ...(isDev && { details, stack: err.stack }),
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    type: 'error',
    error: {
      type: 'not_found',
      message: `Endpoint not found: ${req.method} ${req.path}`,
    },
  });
}
