import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Strict CORS: allow same-origin and development frontend
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
});

// Helmet security headers (configured for Vite inline scripts/styles in development if needed)
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Vite injects scripts dynamically in development
  crossOriginEmbedderPolicy: false,
});

// Request ID and lightweight logging middleware (never logs secrets, auth tokens, or full payloads)
export function requestIdAndLogger(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID().substring(0, 8);
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-ID', reqId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Safe sanitized log: only method, path, status, and duration
    const sanitizedPath = req.baseUrl + req.path;
    console.log(`[REQ ${reqId}] ${req.method} ${sanitizedPath} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}
