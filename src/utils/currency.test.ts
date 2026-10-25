import { describe, it, expect } from 'vitest';
import { formatINR, formatCompactINR } from './currency';

describe('Currency Formatting Utils', () => {
  describe('formatINR - Indian Numbering System', () => {
    it('should format zero correctly', () => {
      expect(formatINR(0)).toBe('₹0');
    });

    it('should format small amounts (under 1 lakh)', () => {
      expect(formatINR(100)).toBe('₹100');
      expect(formatINR(1000)).toBe('₹1,000');
      expect(formatINR(10000)).toBe('₹10,000');
      expect(formatINR(99999)).toBe('₹99,999');
    });

    it('should format lakhs correctly (Indian grouping)', () => {
      expect(formatINR(100000)).toBe('₹1,00,000');
      expect(formatINR(500000)).toBe('₹5,00,000');
      expect(formatINR(999999)).toBe('₹9,99,999');
    });

    it('should format crores correctly', () => {
      expect(formatINR(10000000)).toBe('₹1,00,00,000');
      expect(formatINR(50000000)).toBe('₹5,00,00,000');
    });

    it('should format the example from README: 300000 -> ₹3,00,000', () => {
      expect(formatINR(300000)).toBe('₹3,00,000');
    });

    it('should handle negative amounts', () => {
      expect(formatINR(-1000)).toBe('-₹1,000');
      expect(formatINR(-100000)).toBe('-₹1,00,000');
      expect(formatINR(-5000000)).toBe('-₹50,00,000');
    });

    it('should round decimal amounts to integer', () => {
      expect(formatINR(1000.49)).toBe('₹1,000');
      expect(formatINR(1000.50)).toBe('₹1,001');
      expect(formatINR(999.99)).toBe('₹1,000');
    });

    it('should handle very large numbers', () => {
      expect(formatINR(1000000000)).toBe('₹1,00,00,00,000');
      expect(formatINR(999999999999)).toContain('₹');
    });

    it('should handle NaN gracefully', () => {
      expect(formatINR(NaN)).toBe('₹0');
    });

    it('should handle null/undefined gracefully', () => {
      expect(formatINR(null as any)).toBe('₹0');
      expect(formatINR(undefined as any)).toBe('₹0');
    });

    it('should handle Infinity', () => {
      expect(formatINR(Infinity)).toContain('₹');
      expect(formatINR(-Infinity)).toContain('₹');
    });
  });

  describe('formatCompactINR - Abbreviated Notation', () => {
    it('should show full amount under 1,000', () => {
      expect(formatCompactINR(0)).toBe('₹0');
      expect(formatCompactINR(500)).toBe('₹500');
      expect(formatCompactINR(999)).toBe('₹999');
    });

    it('should use "k" suffix for thousands', () => {
      expect(formatCompactINR(1000)).toBe('₹1.0k');
      expect(formatCompactINR(5000)).toBe('₹5.0k');
      expect(formatCompactINR(25000)).toBe('₹25.0k');
      expect(formatCompactINR(99999)).toBe('₹100.0k');
    });

    it('should use "L" suffix for lakhs', () => {
      expect(formatCompactINR(100000)).toBe('₹1.00 L');
      expect(formatCompactINR(500000)).toBe('₹5.00 L');
      expect(formatCompactINR(2500000)).toBe('₹25.00 L');
      expect(formatCompactINR(9999999)).toBe('₹100.00 L');
    });

    it('should use "Cr" suffix for crores', () => {
      expect(formatCompactINR(10000000)).toBe('₹1.00 Cr');
      expect(formatCompactINR(50000000)).toBe('₹5.00 Cr');
      expect(formatCompactINR(100000000)).toBe('₹10.00 Cr');
      expect(formatCompactINR(1000000000)).toBe('₹100.00 Cr');
    });

    it('should handle negative amounts', () => {
      expect(formatCompactINR(-5000)).toBe('₹-5.0k');
      expect(formatCompactINR(-100000)).toBe('₹-1.00 L');
      expect(formatCompactINR(-10000000)).toBe('₹-1.00 Cr');
    });

    it('should handle NaN gracefully', () => {
      expect(formatCompactINR(NaN)).toBe('₹0');
    });

    it('should round to appropriate decimal places', () => {
      expect(formatCompactINR(1234)).toBe('₹1.2k');
      expect(formatCompactINR(123456)).toBe('₹1.23 L');
      expect(formatCompactINR(12345678)).toBe('₹1.23 Cr');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Number.MAX_SAFE_INTEGER', () => {
      const result = formatINR(Number.MAX_SAFE_INTEGER);
      expect(result).toContain('₹');
      expect(result).not.toBe('₹0');
    });

    it('should handle Number.MIN_SAFE_INTEGER', () => {
      const result = formatINR(Number.MIN_SAFE_INTEGER);
      expect(result).toContain('₹');
      expect(result).toContain('-');
    });

    it('should handle very small negative numbers', () => {
      expect(formatINR(-0.1)).toBe('₹0');
      expect(formatINR(-0.9)).toBe('-₹1');
    });
  });
});
