import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            message: 'Input validation failed',
            code: 'VALIDATION_ERROR',
            details: error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
            requestId: req.headers['x-request-id'],
          },
        });
        return;
      }
      next(error);
    }
  };
}
