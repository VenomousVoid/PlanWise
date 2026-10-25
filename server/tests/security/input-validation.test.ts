import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.ts';
import { geminiClientService } from '../../ai/geminiClient.ts';

describe('Input Validation and Injection Tests', () => {
  const app = createApp();

  beforeEach(() => {
    // Mock AI client to avoid real API calls
    vi.spyOn(geminiClientService, 'isKeyConfigured').mockReturnValue(false);
  });

  describe('Body Size Limits', () => {
    it('should reject payloads over 500KB with 413', async () => {
      const largePayload = {
        name: 'A'.repeat(600 * 1024), // 600KB
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
      };

      const res = await request(app).post('/api/events').send(largePayload);

      expect(res.status).toBe(413);
    });
  });

  describe('Malformed JSON', () => {
    it('should return 400 for malformed JSON without stack trace', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(JSON.stringify(res.body)).not.toContain('stack');
      expect(JSON.stringify(res.body)).not.toContain('at ');
    });
  });

  describe('Type Validation', () => {
    it('should reject wrong types for required fields', async () => {
      const invalidPayload = {
        name: 123, // Should be string
        type: 'wedding',
        date: true, // Should be string
        totalBudget: 'not-a-number', // Should be number
        guestCount: '100', // Should be number
      };

      const res = await request(app).post('/api/events').send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it('should reject negative numbers where invalid', async () => {
      const payload = {
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: -50000, // Negative budget
        guestCount: -10, // Negative guests
      };

      const res = await request(app).post('/api/events').send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject NaN and Infinity', async () => {
      const payload = {
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: NaN,
        guestCount: Infinity,
      };

      const res = await request(app).post('/api/events').send(payload);

      expect(res.status).toBe(400);
    });
  });

  describe('Missing Required Fields', () => {
    it('should reject requests missing required fields', async () => {
      const incompletePayload = {
        name: 'Test Event',
        // Missing type, date, totalBudget, guestCount
      };

      const res = await request(app).post('/api/events').send(incompletePayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Mass Assignment Protection', () => {
    it('should ignore extra unexpected fields in POST /api/events', async () => {
      const payloadWithExtra = {
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
        id: 'injected-id', // Should be ignored/generated
        createdAt: '2020-01-01', // Should be ignored/generated
        isAdmin: true, // Should be ignored
        __proto__: { polluted: true }, // Prototype pollution attempt
        constructor: { polluted: true },
        prototype: { polluted: true },
      };

      const res = await request(app).post('/api/events').send(payloadWithExtra);

      // Should succeed and ignore extra fields
      if (res.status === 201) {
        expect(res.body.event.id).not.toBe('injected-id');
        expect(res.body.event.isAdmin).toBeUndefined();
      }
    });

    it('should not allow prototype pollution via nested objects', async () => {
      const pollutionPayload = {
        name: 'Test',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
        preferences: {
          __proto__: { polluted: true },
        },
      };

      const res = await request(app).post('/api/events').send(pollutionPayload);

      // Check that Object.prototype was not polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('String Length and Content', () => {
    it('should handle extremely long strings', async () => {
      const payload = {
        name: 'A'.repeat(10000),
        type: 'wedding',
        date: '2027-01-01',
        city: 'B'.repeat(10000),
        totalBudget: 100000,
        guestCount: 100,
      };

      const res = await request(app).post('/api/events').send(payload);

      // Should either reject or truncate, not crash
      expect([400, 201]).toContain(res.status);
    });

    it('should handle unicode and emoji in strings', async () => {
      const payload = {
        name: 'राज & प्रिया Wedding 💒',
        type: 'wedding',
        date: '2027-01-01',
        city: 'मुंबई',
        totalBudget: 500000,
        guestCount: 300,
        styleTheme: '🎉 Traditional meets Modern 🎊',
      };

      const res = await request(app).post('/api/events').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.event.name).toContain('राज');
      expect(res.body.event.name).toContain('💒');
    });

    it('should handle control characters and null bytes', async () => {
      const payload = {
        name: 'Test\x00Event\x01With\x02Control',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
      };

      const res = await request(app).post('/api/events').send(payload);

      // Should either sanitize or accept
      expect([400, 201]).toContain(res.status);
    });
  });

  describe('Nested Object Validation', () => {
    it('should reject arrays where objects are expected', async () => {
      const payload = {
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
        preferences: ['this', 'should', 'be', 'an', 'object'], // Wrong type
      };

      const res = await request(app).post('/api/events').send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject deeply nested unexpected structures', async () => {
      const payload = {
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
        preferences: {
          nested: {
            very: {
              deep: {
                object: {
                  structure: 'unexpected',
                },
              },
            },
          },
        },
      };

      const res = await request(app).post('/api/events').send(payload);

      // Should either accept only known fields or reject
      expect([400, 201]).toContain(res.status);
    });
  });

  describe('SQL Injection-like Strings', () => {
    it('should safely handle SQL-like strings in event names', async () => {
      const sqlPayloads = [
        "'; DROP TABLE events; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--",
      ];

      for (const sqlString of sqlPayloads) {
        const payload = {
          name: sqlString,
          type: 'wedding',
          date: '2027-01-01',
          totalBudget: 100000,
          guestCount: 100,
        };

        const res = await request(app).post('/api/events').send(payload);

        // Should not cause any database errors (since we use in-memory)
        // and should treat as regular text
        expect([400, 201]).toContain(res.status);

        if (res.status === 201) {
          // Verify it's stored as inert text
          expect(res.body.event.name).toBe(sqlString);
        }
      }
    });
  });

  describe('Template Literal Injection', () => {
    it('should treat template literals as plain text', async () => {
      const templateStrings = [
        '${process.env.SECRET}',
        '${require("child_process").execSync("ls")}',
        '`malicious code`',
        '#{user.password}',
      ];

      for (const templateString of templateStrings) {
        const payload = {
          name: templateString,
          type: 'birthday',
          date: '2027-01-01',
          totalBudget: 50000,
          guestCount: 50,
        };

        const res = await request(app).post('/api/events').send(payload);

        if (res.status === 201) {
          // Should be stored as literal string, not executed
          expect(res.body.event.name).toBe(templateString);
        }
      }
    });
  });

  describe('Invalid Event IDs', () => {
    it('should return 404 for non-existent event IDs', async () => {
      const res = await request(app).get('/api/events/nonexistent-id-12345');
      expect(res.status).toBe(404);
    });

    it('should handle path traversal attempts in IDs', async () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '....//....//....//etc//passwd',
      ];

      for (const attempt of traversalAttempts) {
        const res = await request(app).get(`/api/events/${attempt}`);
        expect([400, 404]).toContain(res.status);
      }
    });

    it('should handle very long event IDs', async () => {
      const longId = 'x'.repeat(10000);
      const res = await request(app).get(`/api/events/${longId}`);
      expect([400, 404]).toContain(res.status);
    });

    it('should handle special characters in event IDs', async () => {
      const specialIds = ['<script>', '%00', '${id}', 'id;DROP TABLE'];

      for (const id of specialIds) {
        const res = await request(app).get(`/api/events/${id}`);
        expect([400, 404]).toContain(res.status);
      }
    });
  });
});
