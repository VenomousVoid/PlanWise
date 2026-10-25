import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';
import { geminiClientService } from '../ai/geminiClient.ts';

describe('PlanWise REST API Integration Tests', () => {
  const app = createApp();

  beforeEach(() => {
    // Tests must never call the real Gemini API - mock client methods
    vi.spyOn(geminiClientService, 'isKeyConfigured').mockReturnValue(true);
    vi.spyOn(geminiClientService, 'getBudgetAdvice').mockResolvedValue({
      data: {
        tradeOffExplanation: 'Mocked advisory: Trimmed non-essential items to preserve contingency buffer.',
        alternativeSuggestions: ['Swap expensive floral mandap for marigold hanging bells.'],
      },
      isAiGenerated: true,
      fallbackUsed: false,
      modelUsed: 'gemini-3.8-flash',
      source: 'gemini',
    });
    vi.spyOn(geminiClientService, 'getVendorQuestions').mockResolvedValue({
      data: [
        'What is your cancellation and postponement policy?',
        'Are backup generators included?',
        'What is the overtime rate per hour?',
      ],
      isAiGenerated: true,
      fallbackUsed: false,
      modelUsed: 'gemini-3.8-flash',
      source: 'gemini',
    });
  });

  it('GET /api/health returns 200 with system & AI status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.aiStatus).toBeDefined();
    expect(typeof res.body.aiStatus.isKeyConfigured).toBe('boolean');
  });

  it('GET /api/templates returns prebuilt cultural templates', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates.length).toBeGreaterThanOrEqual(5);

    const weddingTemplate = res.body.templates.find((t: any) => t.id === 'north-indian-wedding');
    expect(weddingTemplate).toBeDefined();
    expect(weddingTemplate.defaultCategories.length).toBeGreaterThan(0);
  });

  it('GET /api/events lists seeded dummy events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/events creates an event with normalized budget and timeline', async () => {
    const newEventPayload = {
      name: 'Rohan & Priya Sangeet & Reception',
      type: 'wedding',
      date: '2027-02-15',
      city: 'Udaipur',
      guestCount: 200,
      totalBudget: 1500000,
      styleTheme: 'Lakeside Palace Bohemian Elegance',
      preferences: {
        foodPreference: 'both',
        venueType: 'both',
        culturalTradition: 'Contemporary Punjabi',
      },
    };

    const res = await request(app).post('/api/events').send(newEventPayload);
    expect(res.status).toBe(201);
    expect(res.body.event).toBeDefined();
    expect(res.body.event.id).toBeDefined();
    expect(res.body.event.budgetCategories.length).toBeGreaterThan(0);

    // Sum of budget categories must equal totalBudget exactly
    const sum = res.body.event.budgetCategories.reduce((acc: number, c: any) => acc + c.allocatedAmount, 0);
    expect(sum).toBe(1500000);
  });

  it('POST /api/events rejects invalid input with 400 and structured validation errors', async () => {
    const invalidPayload = {
      name: '', // too short
      type: 'invalid-type', // not in enum
      date: 'not-a-date',
      totalBudget: -500, // negative
    };

    const res = await request(app).post('/api/events').send(invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('POST /api/events/:id/budget/cut-scenario returns deterministic numbers & explanation', async () => {
    const eventsRes = await request(app).get('/api/events');
    const firstEventId = eventsRes.body.events[0].id;

    const res = await request(app)
      .post(`/api/events/${firstEventId}/budget/cut-scenario`)
      .send({ percentage: 15 });

    expect(res.status).toBe(200);
    expect(res.body.scenario).toBeDefined();
    expect(res.body.scenario.requestedCutPercent).toBe(15);
    expect(res.body.scenario.totalSaved).toBeGreaterThan(0);
    expect(res.body.scenario.tradeOffExplanation).toBeDefined();
    expect(Array.isArray(res.body.scenario.alternativeSuggestions)).toBe(true);
  });

  it('GET /api/vendors/questions returns practical questions even without AI key', async () => {
    const res = await request(app).get('/api/vendors/questions?category=catering&eventType=wedding');
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('catering');
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/events/:id/share creates an unguessable snapshot accessible via /api/share/:token', async () => {
    const eventsRes = await request(app).get('/api/events');
    const firstEvent = eventsRes.body.events[0];

    const shareRes = await request(app).post(`/api/events/${firstEvent.id}/share`);
    expect(shareRes.status).toBe(200);
    expect(shareRes.body.snapshot).toBeDefined();
    const token = shareRes.body.snapshot.token;
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(20);

    // Fetch via public read-only route
    const publicRes = await request(app).get(`/api/share/${token}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.snapshot.event.name).toBe(firstEvent.name);

    // Revoke
    const revokeRes = await request(app).delete(`/api/events/${firstEvent.id}/share/${token}`);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.revoked).toBe(true);

    // Verify subsequent lookup fails with 404
    const revokedCheck = await request(app).get(`/api/share/${token}`);
    expect(revokedCheck.status).toBe(404);
  });

  it('handles AI failure gracefully and falls back to deterministic output with flag', async () => {
    vi.spyOn(geminiClientService, 'getBudgetAdvice').mockResolvedValue({
      data: {
        tradeOffExplanation: 'Fallback rule-based advisory applied.',
        alternativeSuggestions: ['Reduce imported flowers.'],
      },
      isAiGenerated: false,
      fallbackUsed: true,
      source: 'fallback',
    });

    const eventsRes = await request(app).get('/api/events');
    const firstEventId = eventsRes.body.events[0].id;

    const res = await request(app)
      .post(`/api/events/${firstEventId}/budget/cut-scenario`)
      .send({ percentage: 10 });

    expect(res.status).toBe(200);
    expect(res.body.scenario.isAiGenerated).toBe(false);
    expect(res.body.scenario.tradeOffExplanation).toBeDefined();
  });

  it('POST /api/events/reset restores demo seed data', async () => {
    const res = await request(app).post('/api/events/reset');
    expect(res.status).toBe(200);
    expect(res.body.events.length).toBeGreaterThanOrEqual(3);
  });
});
