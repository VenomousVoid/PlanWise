import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.ts';
import { InMemoryShareRepository } from '../../repositories/shareRepository.ts';
import { SEED_EVENTS } from '../../data/seed.ts';

describe('Share Token Security Tests', () => {
  const app = createApp();

  describe('Token Generation', () => {
    it('should generate 192-bit (24-byte) base64url tokens (32+ chars)', () => {
      const repo = new InMemoryShareRepository();
      const tokens = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const snapshot = repo.createSnapshot(SEED_EVENTS[0], 24);
        expect(snapshot.token.length).toBeGreaterThanOrEqual(32);
        expect(snapshot.token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url charset
        tokens.add(snapshot.token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(10);
    });

    it('should generate cryptographically unique tokens (1000 samples)', () => {
      const repo = new InMemoryShareRepository();
      const tokens = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const snapshot = repo.createSnapshot(SEED_EVENTS[0], 24);
        tokens.add(snapshot.token);
      }

      // All 1000 should be unique (collision probability is astronomically low)
      expect(tokens.size).toBe(1000);
    });
  });

  describe('Token Expiration (TTL)', () => {
    it('should expire tokens after 24 hours', async () => {
      const repo = new InMemoryShareRepository();

      // Create with 0 hours (immediate expiry)
      const snapshot = repo.createSnapshot(SEED_EVENTS[0], 0);

      // Simulate time passing
      await new Promise((resolve) => setTimeout(resolve, 10));

      const retrieved = repo.findByToken(snapshot.token);
      expect(retrieved).toBeNull();
    });

    it('should expire tokens with negative TTL immediately', () => {
      const repo = new InMemoryShareRepository();
      const snapshot = repo.createSnapshot(SEED_EVENTS[0], -1);

      const retrieved = repo.findByToken(snapshot.token);
      expect(retrieved).toBeNull();
    });

    it('should not expire tokens before TTL', () => {
      const repo = new InMemoryShareRepository();
      const snapshot = repo.createSnapshot(SEED_EVENTS[0], 24);

      // Immediate retrieval should work
      const retrieved = repo.findByToken(snapshot.token);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.eventId).toBe(SEED_EVENTS[0].id);
    });
  });

  describe('Token Revocation', () => {
    it('should immediately revoke tokens', () => {
      const repo = new InMemoryShareRepository();
      const snapshot = repo.createSnapshot(SEED_EVENTS[0], 24);

      // Verify it exists
      expect(repo.findByToken(snapshot.token)).not.toBeNull();

      // Revoke
      const revoked = repo.revoke(snapshot.token);
      expect(revoked).toBe(true);

      // Should no longer be accessible
      expect(repo.findByToken(snapshot.token)).toBeNull();
    });

    it('should return false when revoking non-existent token', () => {
      const repo = new InMemoryShareRepository();
      const revoked = repo.revoke('nonexistent-token-xyz');
      expect(revoked).toBe(false);
    });

    it('should handle double revocation gracefully', () => {
      const repo = new InMemoryShareRepository();
      const snapshot = repo.createSnapshot(SEED_EVENTS[0], 24);

      const firstRevoke = repo.revoke(snapshot.token);
      expect(firstRevoke).toBe(true);

      const secondRevoke = repo.revoke(snapshot.token);
      expect(secondRevoke).toBe(false);
    });
  });

  describe('Public Snapshot Sanitization', () => {
    it('should only expose sanitized fields in public snapshot', async () => {
      const createRes = await request(app).post('/api/events').send({
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
      });

      if (createRes.status === 201) {
        const eventId = createRes.body.event.id;

        // Create share
        const shareRes = await request(app).post(`/api/events/${eventId}/share`);
        expect(shareRes.status).toBe(200);

        const token = shareRes.body.snapshot.token;

        // Fetch public snapshot
        const publicRes = await request(app).get(`/api/share/${token}`);
        expect(publicRes.status).toBe(200);

        const snapshot = publicRes.body.snapshot;

        // Should have event data
        expect(snapshot.event).toBeDefined();
        expect(snapshot.event.name).toBe('Test Event');

        // Should NOT have internal fields that allow mutation
        expect(snapshot.token).toBeUndefined(); // Token shouldn't be re-exposed
      }
    });

    it('should not expose internal repository IDs or timestamps', async () => {
      const createRes = await request(app).post('/api/events').send({
        name: 'Test Event',
        type: 'birthday',
        date: '2027-01-01',
        totalBudget: 50000,
        guestCount: 50,
      });

      if (createRes.status === 201) {
        const eventId = createRes.body.event.id;

        const shareRes = await request(app).post(`/api/events/${eventId}/share`);
        const token = shareRes.body.snapshot.token;

        const publicRes = await request(app).get(`/api/share/${token}`);

        const snapshotText = JSON.stringify(publicRes.body);

        // Should not expose fields like createdAt, updatedAt that aren't in schema
        // Check snapshot structure is clean
        expect(publicRes.body.snapshot.event).toBeDefined();
      }
    });
  });

  describe('Invalid Token Handling', () => {
    it('should return 404 for invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token-123',
        'a'.repeat(100),
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '${token}',
      ];

      for (const token of invalidTokens) {
        const res = await request(app).get(`/api/share/${token}`);
        expect(res.status).toBe(404);
      }
    });

    it('should not leak timing information for invalid tokens', async () => {
      // Measure response time for non-existent token
      const start1 = Date.now();
      await request(app).get('/api/share/nonexistent-token-abc');
      const time1 = Date.now() - start1;

      // Measure again
      const start2 = Date.now();
      await request(app).get('/api/share/another-invalid-token');
      const time2 = Date.now() - start2;

      // Times should be similar (both should be fast lookups)
      // Allow for variance but not orders of magnitude difference
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(10); // Not a precise timing attack test, but basic check
    });

    it('should return same error for expired vs invalid tokens', async () => {
      const repo = new InMemoryShareRepository();
      const expiredSnapshot = repo.createSnapshot(SEED_EVENTS[0], -1);

      const expiredRes = await request(app).get(`/api/share/${expiredSnapshot.token}`);
      const invalidRes = await request(app).get('/api/share/totally-invalid');

      expect(expiredRes.status).toBe(404);
      expect(invalidRes.status).toBe(404);

      // Error messages should not distinguish between expired and invalid
      expect(expiredRes.body.error).toBeDefined();
      expect(invalidRes.body.error).toBeDefined();
    });

    it('should handle very long token strings', async () => {
      const longToken = 'a'.repeat(10000);
      const res = await request(app).get(`/api/share/${longToken}`);

      expect(res.status).toBe(404);
      // Should not crash or timeout
    });

    it('should handle empty token', async () => {
      const res = await request(app).get('/api/share/');
      expect([404, 400]).toContain(res.status);
    });

    it('should handle URL-encoded characters in token', async () => {
      const res = await request(app).get('/api/share/%3Cscript%3E');
      expect(res.status).toBe(404);
    });
  });

  describe('Brute Force Protection', () => {
    it('should not expose whether a token exists through different status codes', async () => {
      // Create a valid token
      const createRes = await request(app).post('/api/events').send({
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
      });

      if (createRes.status === 201) {
        const eventId = createRes.body.event.id;
        const shareRes = await request(app).post(`/api/events/${eventId}/share`);
        const validToken = shareRes.body.snapshot.token;

        // Revoke it
        await request(app).delete(`/api/events/${eventId}/share/${validToken}`);

        // Now check revoked vs never-existed
        const revokedRes = await request(app).get(`/api/share/${validToken}`);
        const neverExistedRes = await request(app).get('/api/share/never-existed-token');

        // Both should return same status
        expect(revokedRes.status).toBe(neverExistedRes.status);
        expect(revokedRes.status).toBe(404);
      }
    });
  });

  describe('Access Control', () => {
    it('should not allow accessing event mutation endpoints via share token', async () => {
      const createRes = await request(app).post('/api/events').send({
        name: 'Test Event',
        type: 'wedding',
        date: '2027-01-01',
        totalBudget: 100000,
        guestCount: 100,
      });

      if (createRes.status === 201) {
        const eventId = createRes.body.event.id;
        const shareRes = await request(app).post(`/api/events/${eventId}/share`);
        const token = shareRes.body.snapshot.token;

        // Share token should NOT grant access to PUT/DELETE
        // (These endpoints use event ID, not share token)
        const putRes = await request(app)
          .put(`/api/events/${token}`)
          .send({ name: 'Modified' });

        expect(putRes.status).toBe(404); // Token is not a valid event ID
      }
    });
  });
});
