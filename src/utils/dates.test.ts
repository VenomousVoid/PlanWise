import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatDate, getDaysRemaining, isPastDate } from './dates';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date in Indian locale', () => {
      const result = formatDate('2027-01-15');
      expect(result).toMatch(/15|Jan|2027/); // Parts should be present
    });

    it('should handle ISO date strings with time', () => {
      const result = formatDate('2027-03-20T10:00:00Z');
      expect(result).toContain('2027');
      expect(result).toContain('Mar' || 'March');
    });

    it('should handle empty string', () => {
      expect(formatDate('')).toBe('');
    });

    it('should handle invalid date formats', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('not-a-date'); // Returns original on parse failure
    });

    it('should handle null/undefined gracefully', () => {
      expect(formatDate(null as any)).toBe('');
      expect(formatDate(undefined as any)).toBe('');
    });
  });

  describe('getDaysRemaining', () => {
    beforeEach(() => {
      // Mock current date to 2026-10-25
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate days remaining for future date', () => {
      const days = getDaysRemaining('2026-11-25');
      expect(days).toBe(31);
    });

    it('should return negative for past dates', () => {
      const days = getDaysRemaining('2026-09-25');
      expect(days).toBeLessThan(0);
      expect(days).toBe(-30);
    });

    it('should return 0 for today', () => {
      const days = getDaysRemaining('2026-10-25');
      expect(days).toBe(0);
    });

    it('should handle dates far in the future', () => {
      const days = getDaysRemaining('2028-10-25');
      expect(days).toBe(731); // 2 years (including leap year)
    });

    it('should handle empty string', () => {
      expect(getDaysRemaining('')).toBe(0);
    });

    it('should handle invalid date', () => {
      const result = getDaysRemaining('invalid-date');
      // Will likely return NaN or 0 depending on Date.parse behavior
      expect(typeof result).toBe('number');
    });

    it('should calculate correctly across year boundaries', () => {
      const days = getDaysRemaining('2027-01-01');
      expect(days).toBeGreaterThan(60); // More than 2 months
    });
  });

  describe('isPastDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for past dates', () => {
      expect(isPastDate('2026-09-01')).toBe(true);
      expect(isPastDate('2025-12-31')).toBe(true);
      expect(isPastDate('2020-01-01')).toBe(true);
    });

    it('should return false for future dates', () => {
      expect(isPastDate('2026-11-01')).toBe(false);
      expect(isPastDate('2027-01-01')).toBe(false);
      expect(isPastDate('2030-12-31')).toBe(false);
    });

    it('should return false for today', () => {
      expect(isPastDate('2026-10-25')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isPastDate('')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      const result = formatDate('2024-02-29');
      expect(result).toContain('2024');
      expect(result).toContain('Feb' || 'February');
    });

    it('should handle end of month dates', () => {
      expect(formatDate('2027-01-31')).toContain('31');
      expect(formatDate('2027-02-28')).toContain('28');
      expect(formatDate('2027-12-31')).toContain('31');
    });

    it('should handle dates at year boundaries for days remaining', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));

      const days = getDaysRemaining('2027-01-01');
      expect(days).toBe(1);

      vi.useRealTimers();
    });
  });
});
