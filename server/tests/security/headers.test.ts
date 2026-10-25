import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.ts';

describe('Security Headers Tests', () => {
  const app = createApp();

  it('should set X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set X-Frame-Options or CSP frame-ancestors', async () => {
    const res = await request(app).get('/api/health');

    // Helmet sets either X-Frame-Options or CSP frame-ancestors
    const hasFrameProtection =
      res.headers['x-frame-options'] ||
      (res.headers['content-security-policy'] && res.headers['content-security-policy'].includes('frame-ancestors'));

    expect(hasFrameProtection).toBeTruthy();
  });

  it('should set Referrer-Policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  it('should not expose X-Powered-By header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should set Strict-Transport-Security in production', async () => {
    const res = await request(app).get('/api/health');

    // HSTS should be present (Helmet default)
    if (process.env.NODE_ENV === 'production') {
      expect(res.headers['strict-transport-security']).toBeDefined();
    }
  });

  it('should set Content-Security-Policy or have helmet defaults', async () => {
    const res = await request(app).get('/api/health');

    // Helmet sets CSP by default
    const hasCSP = res.headers['content-security-policy'] !== undefined;
    expect(hasCSP).toBe(true);
  });

  it('should include security headers on all API routes', async () => {
    const routes = ['/api/health', '/api/templates', '/api/events'];

    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    }
  });

  it('should set X-Request-ID header on all requests', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
  });
});
