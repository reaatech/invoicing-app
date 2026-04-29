import { describe, it, expect } from 'vitest';
import {
  calculateDaysBetween,
  calculateCustomerAnalytics,
  groupInvoicesByMonth,
} from './analytics';

interface InvoiceRecord {
  id: number;
  issue_date?: string;
  due_date?: string;
  paid_at?: string | null;
  status?: string;
  total?: number;
}

describe('calculateDaysBetween', () => {
  it('returns days between two valid date strings', () => {
    expect(calculateDaysBetween('2024-01-01', '2024-01-11')).toBe(10);
  });

  it('returns 0 for same day', () => {
    expect(calculateDaysBetween('2024-01-01', '2024-01-01')).toBe(0);
  });

  it('returns null when start is null', () => {
    expect(calculateDaysBetween(null, '2024-01-01')).toBeNull();
  });

  it('returns null when end is null', () => {
    expect(calculateDaysBetween('2024-01-01', null)).toBeNull();
  });

  it('returns null when start is undefined', () => {
    expect(calculateDaysBetween(undefined, '2024-01-01')).toBeNull();
  });

  it('returns null when end is undefined', () => {
    expect(calculateDaysBetween('2024-01-01', undefined)).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(calculateDaysBetween('not-a-date', '2024-01-01')).toBeNull();
  });

  it('returns null when end is an invalid date', () => {
    expect(calculateDaysBetween('2024-01-01', 'not-a-date')).toBeNull();
  });

  it('returns 0 when end is before start (clamped to 0)', () => {
    expect(calculateDaysBetween('2024-01-10', '2024-01-01')).toBe(0);
  });

  it('returns correct number of days across months', () => {
    expect(calculateDaysBetween('2024-01-28', '2024-02-05')).toBe(8);
  });

  it('handles ISO datetime strings', () => {
    expect(calculateDaysBetween('2024-01-01T00:00:00Z', '2024-01-04T00:00:00Z')).toBe(3);
  });
});

describe('calculateCustomerAnalytics', () => {
  it('returns zeroed analytics for empty array', () => {
    const result = calculateCustomerAnalytics([]);
    expect(result.totalInvoices).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.outstandingAmount).toBe(0);
    expect(result.averageInvoiceAmount).toBe(0);
    expect(result.averageDaysToPay).toBe(0);
    expect(result.onTimePaymentRate).toBe(0);
    expect(result.statusCounts).toEqual({});
  });

  it('counts invoices by status', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, status: 'Paid', total: 100 },
      { id: 2, status: 'Paid', total: 200 },
      { id: 3, status: 'Sent', total: 300 },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.statusCounts).toEqual({ Paid: 2, Sent: 1 });
  });

  it('calculates totalRevenue as sum of Paid invoices', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, status: 'Paid', total: 150 },
      { id: 2, status: 'Sent', total: 400 },
      { id: 3, status: 'Paid', total: 250 },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.totalRevenue).toBe(400); // 150 + 250
  });

  it('calculates outstandingAmount as sum of Sent and Overdue invoices', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, status: 'Sent', total: 100 },
      { id: 2, status: 'Overdue', total: 200 },
      { id: 3, status: 'Paid', total: 300 },
      { id: 4, status: 'Draft', total: 50 },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.outstandingAmount).toBe(300); // 100 + 200
  });

  it('calculates average invoice amount', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, total: 100 },
      { id: 2, total: 200 },
      { id: 3, total: 300 },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.averageInvoiceAmount).toBe(200); // 600 / 3
  });

  it('calculates average days to pay for paid invoices', () => {
    const invoices: InvoiceRecord[] = [
      {
        id: 1,
        status: 'Paid',
        issue_date: '2024-01-01',
        paid_at: '2024-01-11',
        total: 100,
      },
      {
        id: 2,
        status: 'Paid',
        issue_date: '2024-02-01',
        paid_at: '2024-02-06',
        total: 200,
      },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.averageDaysToPay).toBe(7.5); // (10 + 5) / 2
  });

  it('calculates on-time payment rate', () => {
    const invoices: InvoiceRecord[] = [
      {
        id: 1,
        status: 'Paid',
        issue_date: '2024-01-01',
        due_date: '2024-01-15',
        paid_at: '2024-01-10',
        total: 100,
      },
      {
        id: 2,
        status: 'Paid',
        issue_date: '2024-02-01',
        due_date: '2024-02-05',
        paid_at: '2024-02-10',
        total: 200,
      },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.onTimePaymentRate).toBe(50); // 1 out of 2 on time = 50%
  });

  it('counts total invoices correctly', () => {
    const invoices: InvoiceRecord[] = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      total: 10,
    }));
    const result = calculateCustomerAnalytics(invoices);
    expect(result.totalInvoices).toBe(7);
  });

  it('handles invoices with missing status as Unknown', () => {
    const invoices: InvoiceRecord[] = [{ id: 1, total: 100 }];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.statusCounts).toEqual({ Unknown: 1 });
  });

  it('handles invoices with 0 or missing total', () => {
    const invoices: InvoiceRecord[] = [{ id: 1, total: 0 }, { id: 2 }, { id: 3, total: 50 }];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.totalInvoices).toBe(3);
    expect(result.averageInvoiceAmount).toBeCloseTo(16.67, 1);
  });

  it('does not count Cancelled or Draft in outstandingAmount', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, status: 'Draft', total: 100 },
      { id: 2, status: 'Cancelled', total: 200 },
    ];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.outstandingAmount).toBe(0);
  });

  it('returns 0 averageDaysToPay with no paid invoices', () => {
    const invoices: InvoiceRecord[] = [{ id: 1, status: 'Sent', total: 100 }];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.averageDaysToPay).toBe(0);
    expect(result.onTimePaymentRate).toBe(0);
  });

  it('handles paid invoices with missing dates gracefully', () => {
    const invoices: InvoiceRecord[] = [{ id: 1, status: 'Paid', total: 100 }];
    const result = calculateCustomerAnalytics(invoices);
    expect(result.totalRevenue).toBe(100);
    expect(result.averageDaysToPay).toBe(0);
  });
});

describe('groupInvoicesByMonth', () => {
  it('returns empty array for empty input', () => {
    expect(groupInvoicesByMonth([])).toEqual([]);
  });

  it('groups invoices by issue_date month', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, issue_date: '2024-01-15', total: 100 },
      { id: 2, issue_date: '2024-01-20', total: 200 },
      { id: 3, issue_date: '2024-02-10', total: 300 },
    ];
    const result = groupInvoicesByMonth(invoices);
    expect(result).toEqual([
      { month: '2024-01', total: 300 },
      { month: '2024-02', total: 300 },
    ]);
  });

  it('sorts months chronologically', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, issue_date: '2024-01-15', total: 10 },
      { id: 2, issue_date: '2024-03-15', total: 20 },
      { id: 3, issue_date: '2024-02-15', total: 30 },
    ];
    const result = groupInvoicesByMonth(invoices);
    expect(result.map((r) => r.month)).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('skips invoices without issue_date', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, total: 100 },
      { id: 2, issue_date: '2024-01-15', total: 200 },
    ];
    const result = groupInvoicesByMonth(invoices);
    expect(result).toEqual([{ month: '2024-01', total: 200 }]);
  });

  it('skips invoices with invalid issue_date', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, issue_date: 'not-a-date', total: 100 },
      { id: 2, issue_date: '2024-01-15', total: 200 },
    ];
    const result = groupInvoicesByMonth(invoices);
    expect(result).toEqual([{ month: '2024-01', total: 200 }]);
  });

  it('handles invoices with undefined total', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, issue_date: '2024-01-15' },
      { id: 2, issue_date: '2024-01-20', total: 100 },
    ];
    const result = groupInvoicesByMonth(invoices);
    expect(result).toEqual([{ month: '2024-01', total: 100 }]);
  });

  it('handles months spanning different years', () => {
    const invoices: InvoiceRecord[] = [
      { id: 1, issue_date: '2023-12-15', total: 100 },
      { id: 2, issue_date: '2024-01-15', total: 150 },
      { id: 3, issue_date: '2024-01-15', total: 100 },
      { id: 4, issue_date: '2024-02-15', total: 50 },
      { id: 5, issue_date: '2024-03-15', total: 75 },
    ];
    const result = groupInvoicesByMonth(invoices);
    expect(result).toEqual([
      { month: '2023-12', total: 100 },
      { month: '2024-01', total: 250 },
      { month: '2024-02', total: 50 },
      { month: '2024-03', total: 75 },
    ]);
  });
});
