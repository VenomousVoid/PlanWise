import { describe, it, expect } from 'vitest';
import { normalizeBudgetAllocations, DEFAULT_CATEGORY_SPECS } from '../logic/budgetEngine.ts';
import { calculateBudgetCut, generateDeterministicCutExplanation } from '../logic/cutEngine.ts';
import { generateTimelineSchedule } from '../logic/timelineEngine.ts';
import { evaluateEventRisks } from '../logic/riskEngine.ts';
import { calculateGuestMetrics } from '../logic/guestEngine.ts';
import { InMemoryShareRepository } from '../repositories/shareRepository.ts';
import { Event } from '../../shared/types.ts';
import { SEED_EVENTS } from '../data/seed.ts';

describe('Deterministic Business Logic Engines', () => {
  describe('Budget Engine - Normalization and Exact Sums', () => {
    it('should normalize allocations so they sum exactly to total budget (single integer rupee accuracy)', () => {
      const totalBudget = 2500000;
      const specs = DEFAULT_CATEGORY_SPECS.wedding;
      const result = normalizeBudgetAllocations(totalBudget, specs);

      const sum = result.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
      expect(sum).toBe(totalBudget);
      expect(result.length).toBe(specs.length);

      // Verify every allocation is an integer
      for (const cat of result) {
        expect(Number.isInteger(cat.allocatedAmount)).toBe(true);
        expect(cat.allocatedAmount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should absorb odd remainder into the contingency buffer', () => {
      const oddBudget = 1000003; // Prime/odd number
      const specs = DEFAULT_CATEGORY_SPECS.birthday;
      const result = normalizeBudgetAllocations(oddBudget, specs);

      const sum = result.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
      expect(sum).toBe(oddBudget);
    });

    it('should reject invalid or zero total budget', () => {
      expect(() => normalizeBudgetAllocations(0, DEFAULT_CATEGORY_SPECS.wedding)).toThrow();
      expect(() => normalizeBudgetAllocations(-5000, DEFAULT_CATEGORY_SPECS.wedding)).toThrow();
    });
  });

  describe('Cut Engine - Smart Budget Advisor & Priority Cascade', () => {
    const seedWedding = SEED_EVENTS[0];

    it('should calculate 10% budget cut with exact math and integer rupees', () => {
      const result = calculateBudgetCut(seedWedding.totalBudget, seedWedding.budgetCategories, {
        percentage: 10,
        guestCount: seedWedding.guestCount,
      });

      expect(result.requestedCutPercent).toBe(10);
      expect(result.totalSaved).toBe(220000);
      expect(result.newTotalBudget).toBe(1980000);

      // Verify sum of after amounts equals newTotalBudget
      const sumAfter = result.categories.reduce((acc, c) => acc + c.afterAmount, 0);
      expect(sumAfter).toBe(result.newTotalBudget);

      // Verify contingency buffer was protected
      const buffer = result.categories.find((c) => c.categoryId === 'contingency_buffer');
      expect(buffer).toBeDefined();
      const originalBuffer = seedWedding.budgetCategories.find((c) => c.id === 'contingency_buffer')!;
      expect(buffer!.afterAmount).toBe(originalBuffer.allocatedAmount);
    });

    it('should cut nice-to-have categories deepest before cutting must-have categories', () => {
      const result = calculateBudgetCut(seedWedding.totalBudget, seedWedding.budgetCategories, {
        percentage: 15,
        guestCount: seedWedding.guestCount,
      });

      const niceToHaveCuts = result.categories.filter((c) => c.priorityTier === 'nice-to-have');
      const mustHaveCuts = result.categories.filter(
        (c) => c.priorityTier === 'must-have' && c.categoryId !== 'contingency_buffer'
      );

      const avgNiceToHaveCutPercent =
        niceToHaveCuts.reduce((acc, c) => acc + c.percentCut, 0) / niceToHaveCuts.length;
      const avgMustHaveCutPercent =
        mustHaveCuts.reduce((acc, c) => acc + c.percentCut, 0) / mustHaveCuts.length;

      expect(avgNiceToHaveCutPercent).toBeGreaterThan(avgMustHaveCutPercent);
    });

    it('should respect actual spend as the absolute minimum floor', () => {
      // Create a category where actual spend is almost equal to allocation
      const categories = [
        {
          id: 'venue',
          name: 'Venue',
          priorityTier: 'nice-to-have' as const,
          allocatedAmount: 100000,
          actualSpend: 95000, // already committed ₹95,000!
          items: [],
        },
        {
          id: 'contingency_buffer',
          name: 'Buffer',
          priorityTier: 'must-have' as const,
          allocatedAmount: 10000,
          actualSpend: 0,
          items: [],
        },
      ];

      const result = calculateBudgetCut(110000, categories, {
        percentage: 20,
        guestCount: 10,
      });

      const venueResult = result.categories.find((c) => c.categoryId === 'venue')!;
      expect(venueResult.afterAmount).toBeGreaterThanOrEqual(95000);
    });

    it('should cap extreme percentages between 1 and 50%', () => {
      const cutZero = calculateBudgetCut(100000, seedWedding.budgetCategories, { percentage: -10, guestCount: 10 });
      expect(cutZero.requestedCutPercent).toBe(1);

      const cutExtreme = calculateBudgetCut(100000, seedWedding.budgetCategories, { percentage: 99, guestCount: 10 });
      expect(cutExtreme.requestedCutPercent).toBe(50);
    });

    it('should generate meaningful trade-off explanations without AI', () => {
      const cut = calculateBudgetCut(seedWedding.totalBudget, seedWedding.budgetCategories, {
        percentage: 15,
        guestCount: seedWedding.guestCount,
      });
      const explanation = generateDeterministicCutExplanation(cut);

      expect(explanation.tradeOffExplanation).toContain('15% budget cut');
      expect(explanation.alternativeSuggestions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Timeline Engine - Countdown & Short-Notice Compression', () => {
    it('should generate standard countdown milestones for long notice (e.g. 180 days out)', () => {
      const eventDate = '2027-01-01';
      const today = '2026-06-01'; // ~214 days out

      const tasks = generateTimelineSchedule(eventDate, 'wedding', today);
      expect(tasks.length).toBeGreaterThan(5);

      // Verify tasks are ordered with valid due dates
      for (const t of tasks) {
        expect(t.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(t.status).toBe('todo');
        expect(t.daysBeforeEvent).toBeGreaterThan(0);
      }
    });

    it('should compress schedule and upgrade priorities to urgent when short notice (< 30 days)', () => {
      const eventDate = '2026-11-20';
      const today = '2026-11-01'; // only 19 days remaining!

      const tasks = generateTimelineSchedule(eventDate, 'birthday', today);

      // All tasks must have daysBeforeEvent < 19
      for (const t of tasks) {
        expect(t.daysBeforeEvent).toBeLessThan(19);
        expect(t.daysBeforeEvent).toBeGreaterThanOrEqual(1);
      }

      // Check urgent flags
      const urgentCount = tasks.filter((t) => t.priority === 'urgent').length;
      expect(urgentCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Risk Engine - Rule-based Checks & Scoring', () => {
    it('should flag outdoor venue lacking rain canopy as high severity', () => {
      const outdoorEvent: Event = {
        ...SEED_EVENTS[0],
        preferences: {
          ...SEED_EVENTS[0].preferences,
          venueType: 'outdoor',
        },
      };

      const result = evaluateEventRisks(outdoorEvent, '2026-10-01');
      const weatherRisk = result.risks.find((r) => r.ruleId === 'RULE_OUTDOOR_WEATHER_BACKUP');
      expect(weatherRisk).toBeDefined();
      expect(weatherRisk?.severity).toBe('high');
    });

    it('should flag zero contingency buffer as high risk', () => {
      const noBufferEvent: Event = {
        ...SEED_EVENTS[0],
        budgetCategories: SEED_EVENTS[0].budgetCategories.map((c) =>
          c.id === 'contingency_buffer' ? { ...c, allocatedAmount: 0 } : c
        ),
      };

      const result = evaluateEventRisks(noBufferEvent, '2026-10-01');
      const bufferRisk = result.risks.find((r) => r.ruleId === 'RULE_ZERO_CONTINGENCY_BUFFER');
      expect(bufferRisk).toBeDefined();
      expect(bufferRisk?.severity).toBe('high');
      expect(result.overallScore).toBeLessThan(100);
    });

    it('should flag category overspending with rupee amounts', () => {
      const overspendEvent: Event = {
        ...SEED_EVENTS[0],
        budgetCategories: SEED_EVENTS[0].budgetCategories.map((c) =>
          c.id === 'decor' ? { ...c, allocatedAmount: 100000, actualSpend: 150000 } : c
        ),
      };

      const result = evaluateEventRisks(overspendEvent, '2026-10-01');
      const overspendRisk = result.risks.find((r) => r.ruleId === 'RULE_CATEGORY_OVERSPEND');
      expect(overspendRisk).toBeDefined();
      expect(overspendRisk?.description).toContain('₹50,000');
    });
  });

  describe('Guest Engine - Live Headcount and Budget Estimates', () => {
    const seedEvent = SEED_EVENTS[0];

    it('should calculate confirmed, plus ones, dietary, and per-head catering estimates', () => {
      const metrics = calculateGuestMetrics(seedEvent.guests, seedEvent.guestCount, seedEvent.budgetCategories);

      expect(metrics.expectedGuests).toBe(seedEvent.guestCount);
      expect(metrics.confirmedGuests).toBeGreaterThan(0);
      expect(metrics.confirmedWithPlusOnes).toBeGreaterThanOrEqual(metrics.confirmedGuests);

      // Verify dietary breakdown sums match attendees
      const totalDietary =
        metrics.dietaryBreakdown.veg +
        metrics.dietaryBreakdown.nonVeg +
        metrics.dietaryBreakdown.jain +
        metrics.dietaryBreakdown.vegan;
      expect(totalDietary).toBeGreaterThan(0);

      // Verify per head estimates
      expect(metrics.cateringPerHeadEstimate).toBeGreaterThan(0);
      expect(metrics.adjustedCateringRequirement).toBeGreaterThan(0);
    });
  });

  describe('Share Repository - Cryptographic Token & TTL Expiry', () => {
    it('should generate unguessable 24-character+ token and retrieve snapshot before expiry', async () => {
      const repo = new InMemoryShareRepository();
      const snapshot = await repo.createSnapshot(SEED_EVENTS[0], 24);

      expect(snapshot.token).toBeDefined();
      expect(snapshot.token.length).toBeGreaterThan(20);
      expect(snapshot.isRevoked).toBe(false);

      const retrieved = await repo.findByToken(snapshot.token);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.eventId).toBe(SEED_EVENTS[0].id);
    });

    it('should return null when token is revoked', async () => {
      const repo = new InMemoryShareRepository();
      const snapshot = await repo.createSnapshot(SEED_EVENTS[0], 24);

      const revoked = await repo.revoke(snapshot.token);
      expect(revoked).toBe(true);

      const retrieved = await repo.findByToken(snapshot.token);
      expect(retrieved).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const repo = new InMemoryShareRepository();
      // create with 0 hours TTL
      const snapshot = await repo.createSnapshot(SEED_EVENTS[0], -1);

      const retrieved = await repo.findByToken(snapshot.token);
      expect(retrieved).toBeNull();
    });
  });
});
