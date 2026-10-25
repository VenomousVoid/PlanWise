import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
  CACHE_MAX_ENTRIES: 100,
};
