import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats a positive number as USD', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a numeric string', () => {
    expect(formatCurrency('789.01')).toBe('$789.01');
  });

  it('formats a negative number', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });

  it('returns $0.00 for null', () => {
    expect(formatCurrency(null)).toBe('$0.00');
  });

  it('returns $0.00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });

  it('formats a float with many decimal places', () => {
    expect(formatCurrency(99.999)).toBe('$100.00');
  });

  it('formats a string that is not a valid number as NaN currency', () => {
    const result = formatCurrency('not-a-number');
    expect(result).toBe('$NaN');
  });

  it('formats an integer as a whole dollar amount', () => {
    expect(formatCurrency(42)).toBe('$42.00');
  });

  it('formats with cents rounding', () => {
    expect(formatCurrency(10.005)).toBe('$10.01');
  });
});
