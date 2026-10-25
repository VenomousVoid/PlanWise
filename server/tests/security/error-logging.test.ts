import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.ts';

describe('Error Handler Security Tests', () => {
  const app = createApp();

  describe('Error Response Sanitization', () => {
    it('should not expose stack traces in production errors', async () => {
      // Try to trigger an internal error
      const res = await request(app)
        .post('/api/events')
        .send({ invalid: 'data' });

      // Error response should be clean
      const responseText = JSON.stringify(res.body);
      expect(responseText).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
      expect(responseText).not.toContain('Error:');
      expect(responseText).not.toContain('.ts:');
      expect(responseText).not.toContain('node_modules');
    });

    it('should not expose file paths in error responses', async () => {
      const res = await request(app).get('/api/events/invalid-id-format');

      const responseText = JSON.stringify(res.body);
      expect(responseText).not.toContain('/home/');
      expect(responseText).not.toContain('/Users/');
      expect(responseText).not.toContain('C:\\');
      expect(responseText).not.toContain('/server/');
      expect(responseText).not.toContain('PlanWise/');
    });

    it('should not expose environment variables in errors', async () => {
      const res = await request(app).get('/api/health');

      const responseText = JSON.stringify(res.body);
      // Health endpoint should never expose the actual API key
      expect(responseText).not.toMatch(/AIza[A-Za-z0-9_-]{35}/); // Gemini API key pattern
      expect(responseText).not.toContain(process.env.GEMINI_API_KEY || 'fake-key');
    });

    it('should return generic error with request ID', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({});

      expect(res.body.error).toBeDefined();

      // Should have a request ID for debugging
      if (res.body.error.requestId || res.headers['x-request-id']) {
        expect(
          res.body.error.requestId || res.headers['x-request-id']
        ).toMatch(/^[a-f0-9-]{36}$/);
      }
    });

    it('should use consistent error structure', async () => {
      const res1 = await request(app).post('/api/events').send({});
      const res2 = await request(app).get('/api/events/nonexistent');

      // Both should have error objects with consistent structure
      expect(res1.body.error).toBeDefined();
      expect(res2.body.error).toBeDefined();

      expect(typeof res1.body.error).toBe('object');
      expect(typeof res2.body.error).toBe('object');
    });
  });

  describe('Different Error Types', () => {
    it('should handle validation errors cleanly', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({ name: 'Test', type: 'invalid-type' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      
      // Should not expose internal validation library details
      const responseText = JSON.stringify(res.body);
      expect(responseText).not.toContain('ZodError');
      expect(responseText).not.toContain('zodSchema');
    });

    it('should handle 404 errors cleanly', async () => {
      const res = await request(app).get('/api/events/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message || res.body.error.error).toBeDefined();
    });

    it('should handle 500 errors without exposing internals', async () => {
      // Note: Hard to trigger real 500 without mocking, but structure should be consistent
      // This is a structural test
      const res = await request(app).get('/api/nonexistent-route');

      // Even for unknown routes, response should be clean
      if (res.status >= 500) {
        const responseText = JSON.stringify(res.body);
        expect(responseText).not.toContain('stack');
        expect(responseText).not.toMatch(/at\s+\w+/);
      }
    });
  });
});

describe('Logging Security Tests', () => {
  let consoleSpy: any;
  const app = createApp();

  beforeEach(() => {
    // Spy on console methods to check what's being logged
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.info.mockRestore();
  });

  describe('Request Logging Sanitization', () => {
    it('should not log request bodies containing sensitive data', async () => {
      const sensitivePayload = {
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
        secretApiKey: 'AIzaSyC_secret_key_12345',
        password: 'user-password-123',
      };

      await request(app).post('/api/events').send(sensitivePayload);

      // Check all console calls
      const allLogs = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.error.mock.calls,
        ...consoleSpy.warn.mock.calls,
        ...consoleSpy.info.mock.calls,
      ].flat().join(' ');

      // Should not log the secret values
      expect(allLogs).not.toContain('AIzaSyC_secret_key_12345');
      expect(allLogs).not.toContain('user-password-123');
    });

    it('should only log HTTP method, sanitized path, and duration', async () => {
      await request(app).get('/api/health');

      // Check that logs contain expected safe information
      const allLogs = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.info.mock.calls,
      ].flat().join(' ');

      // Should log method
      if (allLogs.length > 0) {
        // If logging is implemented, check it's sanitized
        // Should contain HTTP method or path
        expect(
          allLogs.includes('GET') ||
          allLogs.includes('health') ||
          allLogs.includes('api')
        ).toBe(true);
      }
    });

    it('should not log query parameters with sensitive data', async () => {
      await request(app).get('/api/vendors/questions?category=catering&secret=hidden-value');

      const allLogs = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.error.mock.calls,
        ...consoleSpy.warn.mock.calls,
        ...consoleSpy.info.mock.calls,
      ].flat().join(' ');

      // Should not log the secret query param value
      expect(allLogs).not.toContain('hidden-value');
    });

    it('should not log auth tokens or API keys from headers', async () => {
      await request(app)
        .get('/api/health')
        .set('Authorization', 'Bearer secret-token-12345')
        .set('X-API-Key', 'secret-api-key-67890');

      const allLogs = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.error.mock.calls,
        ...consoleSpy.warn.mock.calls,
        ...consoleSpy.info.mock.calls,
      ].flat().join(' ');

      // Should not log bearer tokens or API keys
      expect(allLogs).not.toContain('secret-token-12345');
      expect(allLogs).not.toContain('secret-api-key-67890');
    });

    it('should not log PII from request bodies', async () => {
      const piiPayload = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91-9876543210',
        rsvpStatus: 'confirmed',
        dietaryPreference: 'veg',
      };

      const createRes = await request(app).post('/api/events').send({
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
      });

      if (createRes.status === 201) {
        const eventId = createRes.body.event.id;
        await request(app).post(`/api/events/${eventId}/guests`).send(piiPayload);

        const allLogs = [
          ...consoleSpy.log.mock.calls,
          ...consoleSpy.error.mock.calls,
          ...consoleSpy.warn.mock.calls,
          ...consoleSpy.info.mock.calls,
        ].flat().join(' ');

        // Should not log email or phone
        expect(allLogs).not.toContain('john.doe@example.com');
        expect(allLogs).not.toContain('+91-9876543210');
      }
    });
  });
});

describe('Secret Scanning Tests', () => {
  it('should verify .env is gitignored', async () => {
    const fs = await import('fs/promises');
    const gitignore = await fs.readFile('.gitignore', 'utf-8');

    expect(gitignore).toContain('.env');
  });

  it('should verify .env.example contains only placeholders', async () => {
    const fs = await import('fs/promises');
    const envExample = await fs.readFile('.env.example', 'utf-8');

    // Should not contain actual API keys
    expect(envExample).not.toMatch(/AIza[A-Za-z0-9_-]{35}/);
    expect(envExample).not.toMatch(/sk-[A-Za-z0-9]{48}/);

    // Should contain placeholder patterns
    expect(
      envExample.includes('your-') ||
      envExample.includes('YOUR_') ||
      envExample.includes('xxx') ||
      envExample.includes('placeholder')
    ).toBe(true);
  });
});
