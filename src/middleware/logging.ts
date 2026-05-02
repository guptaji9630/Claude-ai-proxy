import { Request, Response, NextFunction } from 'express';

/**
 * Simple request/response logging middleware
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data: unknown) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Extract model from request body if available
    let model = 'unknown';
    try {
      if (typeof (req as any).body === 'object' && (req as any).body?.model) {
        model = (req as any).body.model;
      }
    } catch (e) {
      // Silently ignore parsing errors
    }

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ` +
      `Status: ${statusCode} - Model: ${model} - Duration: ${duration}ms`
    );

    return originalSend.call(this, data);
  };

  next();
}
