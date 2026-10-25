import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const reqId = req.headers['x-request-id'] || 'unknown';

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Invalid request input data',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
        requestId: reqId,
      },
    });
    return;
  }

  // Handle standard errors
  const status = (err as any)?.status || (err as any)?.statusCode || 500;
  const message = (err as Error)?.message || 'An unexpected internal error occurred';

  // Do not expose stack traces to client
  res.status(status).json({
    error: {
      message: status === 500 ? 'Internal server error' : message,
      code: status === 404 ? 'NOT_FOUND' : status === 400 ? 'BAD_REQUEST' : 'SERVER_ERROR',
      requestId: reqId,
    },
  });
}
