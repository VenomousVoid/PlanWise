import express, { Express } from 'express';
import compression from 'compression';
import { corsMiddleware, helmetMiddleware, requestIdAndLogger } from './middleware/security.ts';
import { standardApiLimiter } from './middleware/rateLimiter.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { apiRouter } from './routes/api.ts';

export function createApp(): Express {
  const app = express();

  // Trust proxy for Cloud Run and reverse proxies (fixes X-Forwarded-For validation)
  app.set('trust proxy', 1);

  // Security & utility middlewares
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: '500kb' }));
  app.use(requestIdAndLogger);

  // Rate limiting on API routes
  app.use('/api', standardApiLimiter);

  // Mount API router
  app.use('/api', apiRouter);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
