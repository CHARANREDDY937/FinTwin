import { describe, it, expect } from 'vitest';
import {
  toNumber,
  currency,
  ensureRupees,
  average,
  latestByMonth,
} from '../lib/utils';

describe('utils', () => {
  describe('toNumber', () => {
    it('converts valid numbers', () => {
      expect(toNumber('100')).toBe(100);
      expect(toNumber(100)).toBe(100);
      expect(toNumber('100.5')).toBe(100.5);
    });

    it('returns 0 for invalid input', () => {
      expect(toNumber('abc')).toBe(0);
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber(NaN)).toBe(0);
    });
  });

  describe('currency', () => {
    it('formats INR correctly', () => {
      expect(currency(100000)).toBe('₹1,00,000');
      expect(currency(1234567)).toBe('₹12,34,567');
      expect(currency(0)).toBe('₹0');
    });
  });

  describe('ensureRupees', () => {
    it('converts USD to INR', () => {
      const result = ensureRupees('$100 USD');
      expect(result).toContain('₹');
    });

    it('converts dollar amounts', () => {
      const result = ensureRupees('$1,000');
      expect(result).toBe('₹1,000');
    });

    it('handles dollars text', () => {
      const result = ensureRupees('100 dollars');
      expect(result).toContain('₹');
    });

    it('returns non-strings as-is', () => {
      expect(ensureRupees(123)).toBe(123);
      expect(ensureRupees(null)).toBe(null);
    });
  });

  describe('average', () => {
    it('calculates average correctly', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3);
      expect(average([10, 20])).toBe(15);
    });

    it('returns 0 for empty array', () => {
      expect(average([])).toBe(0);
    });
  });

  describe('latestByMonth', () => {
    it('returns latest month', () => {
      const months = [
        { month: '2024-01', value: 1 },
        { month: '2024-03', value: 3 },
        { month: '2024-02', value: 2 },
      ];
      expect(latestByMonth(months)).toEqual({ month: '2024-03', value: 3 });
    });

    it('returns null for empty array', () => {
      expect(latestByMonth([])).toBeNull();
    });
  });
});