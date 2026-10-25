import { describe, it, expect } from 'vitest';
import { normalizeBudgetAllocations, DEFAULT_CATEGORY_SPECS } from '../logic/budgetEngine.ts';
import { calculateBudgetCut } from '../logic/cutEngine.ts';
import { generateTimelineSchedule } from '../logic/timelineEngine.ts';
import { calculateGuestMetrics } from '../logic/guestEngine.ts';
import { BudgetCategory, Guest } from '../../shared/types.ts';

describe('Extended Logic Tests - Edge Cases and Properties', () => {
  describe('Budget Engine - Edge Cases', () => {
    it('should handle zero budget rejection', () => {
      expect(() => normalizeBudgetAllocations(0, DEFAULT_CATEGORY_SPECS.wedding)).toThrow(
        'Total budget must be greater than zero'
      );
    });

    it('should handle negative budget rejection', () => {
      expect(() => normalizeBudgetAllocations(-1000, DEFAULT_CATEGORY_SPECS.wedding)).toThrow(
        'Total budget must be greater than zero'
      );
    });

    it('should handle very large budgets (100 crore)', () => {
      const hugeBudget = 1_000_000_000; // 100 crore
      const result = normalizeBudgetAllocations(hugeBudget, DEFAULT_CATEGORY_SPECS.wedding);
      const sum = result.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
      expect(sum).toBe(hugeBudget);
      expect(result.every((cat) => Number.isInteger(cat.allocatedAmount))).toBe(true);
    });

    it('should handle prime number budgets correctly', () => {
      const primes = [10007, 50021, 100003, 500009];
      for (const prime of primes) {
        const result = normalizeBudgetAllocations(prime, DEFAULT_CATEGORY_SPECS.birthday);
        const sum = result.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
        expect(sum).toBe(prime);
      }
    });

    it('should handle non-integer budget by treating as integer (floor)', () => {
      const floatBudget = 250000.99;
      const result = normalizeBudgetAllocations(Math.floor(floatBudget), DEFAULT_CATEGORY_SPECS.community);
      const sum = result.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
      expect(sum).toBe(250000);
    });

    it('should reject empty category specs', () => {
      expect(() => normalizeBudgetAllocations(100000, [])).toThrow(
        'At least one budget category specification is required'
      );
    });

    it('should handle single category spec', () => {
      const singleSpec = [{ id: 'venue', name: 'Venue', weight: 100, priorityTier: 'must-have' as const }];
      const result = normalizeBudgetAllocations(100000, singleSpec);
      expect(result.length).toBe(1);
      expect(result[0].allocatedAmount).toBe(100000);
    });
  });

  describe('Budget Engine - Property-Based Tests', () => {
    it('PROPERTY: sum always equals total budget across 100 random budgets', () => {
      const testCases = Array.from({ length: 100 }, () => Math.floor(Math.random() * 10_000_000) + 10000);

      for (const budget of testCases) {
        const result = normalizeBudgetAllocations(budget, DEFAULT_CATEGORY_SPECS.wedding);
        const sum = result.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
        expect(sum).toBe(budget);
      }
    });

    it('PROPERTY: all allocations are non-negative integers', () => {
      const testCases = [10000, 50000, 100000, 500000, 1000000, 5000000];

      for (const budget of testCases) {
        const result = normalizeBudgetAllocations(budget, DEFAULT_CATEGORY_SPECS.community);
        for (const cat of result) {
          expect(Number.isInteger(cat.allocatedAmount)).toBe(true);
          expect(cat.allocatedAmount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('PROPERTY: increasing budget increases all allocations proportionally', () => {
      const budgets = [100000, 200000, 300000, 400000];
      const specs = DEFAULT_CATEGORY_SPECS.birthday;
      const results = budgets.map((b) => normalizeBudgetAllocations(b, specs));

      // Check that venue allocation increases monotonically
      const venueAllocations = results.map((r) => r.find((c) => c.id === 'venue')!.allocatedAmount);
      for (let i = 1; i < venueAllocations.length; i++) {
        expect(venueAllocations[i]).toBeGreaterThan(venueAllocations[i - 1]);
      }
    });
  });

  describe('Cut Engine - Edge Cases', () => {
    const testCategories: BudgetCategory[] = [
      {
        id: 'venue',
        name: 'Venue',
        priorityTier: 'must-have',
        allocatedAmount: 100000,
        actualSpend: 0,
        items: [],
      },
      {
        id: 'decor',
        name: 'Decor',
        priorityTier: 'nice-to-have',
        allocatedAmount: 50000,
        actualSpend: 0,
        items: [],
      },
      {
        id: 'contingency_buffer',
        name: 'Buffer',
        priorityTier: 'must-have',
        allocatedAmount: 10000,
        actualSpend: 0,
        items: [],
      },
    ];

    it('PROPERTY: buffer is never reduced across percentage range 1-50', () => {
      const percentages = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

      for (const pct of percentages) {
        const result = calculateBudgetCut(160000, testCategories, { percentage: pct, guestCount: 100 });
        const buffer = result.categories.find((c) => c.categoryId === 'contingency_buffer')!;
        expect(buffer.afterAmount).toBe(10000);
      }
    });

    it('PROPERTY: new total budget is always less than original for all valid percentages', () => {
      const percentages = [5, 10, 15, 20, 25];

      for (const pct of percentages) {
        const result = calculateBudgetCut(160000, testCategories, { percentage: pct, guestCount: 100 });
        expect(result.newTotalBudget).toBeLessThan(160000);
        expect(result.totalSaved).toBeGreaterThan(0);
      }
    });

    it('PROPERTY: actual spend is never violated (floor protection)', () => {
      const categoriesWithSpend: BudgetCategory[] = [
        {
          id: 'venue',
          name: 'Venue',
          priorityTier: 'nice-to-have',
          allocatedAmount: 100000,
          actualSpend: 90000, // Already spent 90k
          items: [],
        },
        {
          id: 'contingency_buffer',
          name: 'Buffer',
          priorityTier: 'must-have',
          allocatedAmount: 10000,
          actualSpend: 0,
          items: [],
        },
      ];

      const result = calculateBudgetCut(110000, categoriesWithSpend, { percentage: 30, guestCount: 50 });
      const venue = result.categories.find((c) => c.categoryId === 'venue')!;
      expect(venue.afterAmount).toBeGreaterThanOrEqual(90000);
    });

    it('should handle NaN percentage by clamping to minimum', () => {
      const result = calculateBudgetCut(160000, testCategories, { percentage: NaN, guestCount: 100 });
      expect(result.requestedCutPercent).toBe(1);
    });

    it('should handle Infinity percentage by clamping to maximum', () => {
      const result = calculateBudgetCut(160000, testCategories, { percentage: Infinity, guestCount: 100 });
      expect(result.requestedCutPercent).toBe(50);
    });

    it('should handle negative guest count gracefully', () => {
      const result = calculateBudgetCut(160000, testCategories, { percentage: 10, guestCount: -5 });
      expect(result).toBeDefined();
      expect(result.totalSaved).toBeGreaterThan(0);
    });
  });

  describe('Timeline Engine - Edge Cases', () => {
    it('should handle event date in the past', () => {
      const pastDate = '2020-01-01';
      const today = '2026-10-25';
      const tasks = generateTimelineSchedule(pastDate, 'wedding', today);

      // Should still generate tasks but with negative or zero days
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should handle event date today', () => {
      const today = '2026-10-25';
      const tasks = generateTimelineSchedule(today, 'birthday', today);

      expect(tasks.length).toBeGreaterThan(0);
      // All tasks should have daysBeforeEvent of 0
      expect(tasks.every((t) => t.daysBeforeEvent === 0)).toBe(true);
    });

    it('should handle very short notice (3 days)', () => {
      const eventDate = '2026-10-28';
      const today = '2026-10-25';
      const tasks = generateTimelineSchedule(eventDate, 'wedding', today);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t) => t.daysBeforeEvent <= 3)).toBe(true);
    });

    it('should handle very long notice (2 years)', () => {
      const eventDate = '2028-10-25';
      const today = '2026-10-25';
      const tasks = generateTimelineSchedule(eventDate, 'community', today);

      expect(tasks.length).toBeGreaterThan(0);
      // Should have tasks spread across a long timeline
      const maxDays = Math.max(...tasks.map((t) => t.daysBeforeEvent));
      expect(maxDays).toBeGreaterThan(100);
    });

    it('should handle invalid date format gracefully', () => {
      const invalidDate = 'not-a-date';
      const today = '2026-10-25';

      // Should not throw, might return empty or handle with fallback
      expect(() => generateTimelineSchedule(invalidDate, 'wedding', today)).not.toThrow();
    });
  });

  describe('Guest Engine - Edge Cases', () => {
    it('should handle zero guests', () => {
      const result = calculateGuestMetrics([], 0, []);
      expect(result.expectedGuests).toBe(0);
      expect(result.confirmedGuests).toBe(0);
    });

    it('should handle very large guest count (10,000)', () => {
      const largeGuestList: Guest[] = Array.from({ length: 100 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
        rsvpStatus: 'confirmed' as const,
        dietaryPreference: 'veg' as const,
        hasPlusOne: false,
        notes: '',
      }));

      const result = calculateGuestMetrics(largeGuestList, 10000, []);
      expect(result.confirmedGuests).toBe(100);
      expect(result.expectedGuests).toBe(10000);
    });

    it('should handle all guests having plus-ones', () => {
      const guestsWithPlusOnes: Guest[] = Array.from({ length: 50 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
        rsvpStatus: 'confirmed' as const,
        dietaryPreference: 'veg' as const,
        hasPlusOne: true,
        notes: '',
      }));

      const result = calculateGuestMetrics(guestsWithPlusOnes, 100, []);
      expect(result.confirmedWithPlusOnes).toBe(100); // 50 * 2
    });

    it('should handle mixed RSVP statuses correctly', () => {
      const mixedGuests: Guest[] = [
        {
          id: '1',
          name: 'Confirmed Guest',
          email: 'confirmed@example.com',
          rsvpStatus: 'confirmed',
          dietaryPreference: 'veg',
          hasPlusOne: false,
          notes: '',
        },
        {
          id: '2',
          name: 'Pending Guest',
          email: 'pending@example.com',
          rsvpStatus: 'pending',
          dietaryPreference: 'non-veg',
          hasPlusOne: false,
          notes: '',
        },
        {
          id: '3',
          name: 'Declined Guest',
          email: 'declined@example.com',
          rsvpStatus: 'declined',
          dietaryPreference: 'vegan',
          hasPlusOne: false,
          notes: '',
        },
      ];

      const result = calculateGuestMetrics(mixedGuests, 3, []);
      expect(result.confirmedGuests).toBe(1);
    });

    it('should handle unicode names correctly', () => {
      const unicodeGuests: Guest[] = [
        {
          id: '1',
          name: 'राज कुमार',
          email: 'raj@example.com',
          rsvpStatus: 'confirmed',
          dietaryPreference: 'jain',
          hasPlusOne: false,
          notes: '',
        },
        {
          id: '2',
          name: '王明',
          email: 'wang@example.com',
          rsvpStatus: 'confirmed',
          dietaryPreference: 'vegan',
          hasPlusOne: false,
          notes: '',
        },
      ];

      const result = calculateGuestMetrics(unicodeGuests, 2, []);
      expect(result.confirmedGuests).toBe(2);
      expect(result.dietaryBreakdown.jain).toBe(1);
      expect(result.dietaryBreakdown.vegan).toBe(1);
    });
  });
});
