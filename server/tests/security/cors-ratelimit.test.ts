import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.ts';

describe('CORS Security Tests', () => {
  const app = createApp();

  it('should allow requests from configured origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should not set wildcard CORS with credentials', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');

    // If credentials are allowed, origin must not be *
    if (res.headers['access-control-allow-credentials'] === 'true') {
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    }
  });

  it('should handle preflight OPTIONS requests', async () => {
    const res = await request(app)
      .options('/api/events')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-methods']).toBeDefined();
  });
});

describe('Rate Limiting Tests', () => {
  let app: any;

  beforeEach(() => {
    // Create fresh app instance for each test to reset rate limit counters
    app = createApp();
  });

  it('should allow requests under the standard API rate limit', async () => {
    // Make several requests that should be under the limit
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    }
  });

  it('should eventually trigger 429 if limit exceeded (stress test)', async () => {
    // This test simulates hitting the rate limit
    // Standard limit is 200 per 10 minutes according to README

    const requests = [];
    for (let i = 0; i < 250; i++) {
      requests.push(request(app).get('/api/health'));
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter((r) => r.status === 429);

    // At least some should be rate limited
    expect(tooManyRequests.length).toBeGreaterThan(0);
  }, 30000);

  it('should return rate limit headers', async () => {
    const res = await request(app).get('/api/health');

    // Express rate limit sets these headers
    expect(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']).toBeDefined();
  });

  it('should have stricter limits on AI endpoints', async () => {
    // AI endpoints should have 50 per 10 min limit vs 200 for standard
    // We'll verify by checking if AI endpoints hit limits faster

    const aiRequests = [];
    for (let i = 0; i < 60; i++) {
      aiRequests.push(
        request(app)
          .get('/api/vendors/questions?category=catering&eventType=wedding')
      );
    }

    const aiResponses = await Promise.all(aiRequests);
    const aiRateLimited = aiResponses.filter((r) => r.status === 429);

    // Should have some rate limited responses
    expect(aiRateLimited.length).toBeGreaterThan(0);
  }, 30000);

  it('429 response should include Retry-After header', async () => {
    // Exhaust rate limit
    const requests = [];
    for (let i = 0; i < 250; i++) {
      requests.push(request(app).get('/api/health'));
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.find((r) => r.status === 429);

    if (rateLimited) {
      expect(
        rateLimited.headers['retry-after'] ||
        rateLimited.headers['x-ratelimit-reset']
      ).toBeDefined();
    }
  }, 30000);
});
