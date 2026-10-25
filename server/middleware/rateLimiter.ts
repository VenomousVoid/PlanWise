import rateLimit from 'express-rate-limit';
import { Request } from 'express';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// Standard rate limiter for all standard API endpoints (200 requests per 10 minutes)
export const standardApiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    default: false,
  },
  message: {
    error: {
      message: 'Too many requests, please slow down and try again shortly.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// Stricter rate limiter for AI generation endpoints to preserve free-tier quota (50 requests per 10 minutes)
export const aiEndpointLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    default: false,
  },
  message: {
    error: {
      message: 'AI request limit reached for this session. Please try again in a few moments.',
      code: 'AI_RATE_LIMIT_EXCEEDED',
    },
  },
});

