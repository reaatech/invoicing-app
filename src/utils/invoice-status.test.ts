import { describe, it, expect } from 'vitest';
import {
  getStatusCssColor,
  getStatusIcon,
  canEditInvoice,
  canDeleteInvoice,
} from './invoice-status';

describe('getStatusCssColor', () => {
  it('returns gray for Draft', () => {
    expect(getStatusCssColor('Draft')).toBe('#6b7280');
  });

  it('returns blue for Sent', () => {
    expect(getStatusCssColor('Sent')).toBe('#2563eb');
  });

  it('returns green for Paid', () => {
    expect(getStatusCssColor('Paid')).toBe('#16a34a');
  });

  it('returns red for Overdue', () => {
    expect(getStatusCssColor('Overdue')).toBe('#ef4444');
  });

  it('returns light gray for Cancelled', () => {
    expect(getStatusCssColor('Cancelled')).toBe('#9ca3af');
  });

  it('returns gray for unknown status', () => {
    expect(getStatusCssColor('Unknown')).toBe('#6b7280');
  });

  it('returns gray for empty string', () => {
    expect(getStatusCssColor('')).toBe('#6b7280');
  });
});

describe('getStatusIcon', () => {
  it('returns a truthy value for Draft', () => {
    expect(getStatusIcon('Draft')).toBeTruthy();
  });

  it('returns a truthy value for Sent', () => {
    expect(getStatusIcon('Sent')).toBeTruthy();
  });

  it('returns a truthy value for Paid', () => {
    expect(getStatusIcon('Paid')).toBeTruthy();
  });

  it('returns a truthy value for Overdue', () => {
    expect(getStatusIcon('Overdue')).toBeTruthy();
  });

  it('returns a truthy value for Cancelled', () => {
    expect(getStatusIcon('Cancelled')).toBeTruthy();
  });

  it('returns different icons for different statuses', () => {
    const draft = getStatusIcon('Draft');
    const sent = getStatusIcon('Sent');
    expect(draft).not.toBe(sent);
  });

  it('returns a truthy value for unknown status', () => {
    expect(getStatusIcon('Unknown')).toBeTruthy();
  });
});

describe('canEditInvoice', () => {
  it('returns true for Draft', () => {
    expect(canEditInvoice('Draft')).toBe(true);
  });

  it('returns false for Sent', () => {
    expect(canEditInvoice('Sent')).toBe(false);
  });

  it('returns false for Paid', () => {
    expect(canEditInvoice('Paid')).toBe(false);
  });

  it('returns false for Overdue', () => {
    expect(canEditInvoice('Overdue')).toBe(false);
  });

  it('returns false for Cancelled', () => {
    expect(canEditInvoice('Cancelled')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(canEditInvoice('Unknown')).toBe(false);
  });
});

describe('canDeleteInvoice', () => {
  it('returns true for Draft', () => {
    expect(canDeleteInvoice('Draft')).toBe(true);
  });

  it('returns true for Cancelled', () => {
    expect(canDeleteInvoice('Cancelled')).toBe(true);
  });

  it('returns false for Sent', () => {
    expect(canDeleteInvoice('Sent')).toBe(false);
  });

  it('returns false for Paid', () => {
    expect(canDeleteInvoice('Paid')).toBe(false);
  });

  it('returns false for Overdue', () => {
    expect(canDeleteInvoice('Overdue')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(canDeleteInvoice('Unknown')).toBe(false);
  });
});
