import { FileEdit, Send, CheckCircle, AlertCircle, XCircle, type LucideIcon } from 'lucide-react';

export const getStatusCssColor = (status: string): string => {
  switch (status) {
    case 'Draft': return '#6b7280';
    case 'Sent': return '#2563eb';
    case 'Paid': return '#16a34a';
    case 'Overdue': return '#ef4444';
    case 'Cancelled': return '#9ca3af';
    default: return '#6b7280';
  }
};

export function getStatusIcon(status: string): LucideIcon {
  switch (status) {
    case 'Draft':
      return FileEdit;
    case 'Sent':
      return Send;
    case 'Paid':
      return CheckCircle;
    case 'Overdue':
      return AlertCircle;
    case 'Cancelled':
      return XCircle;
    default:
      return FileEdit;
  }
}

export function canEditInvoice(status: string): boolean {
  return status === 'Draft';
}

export function canDeleteInvoice(status: string): boolean {
  return status === 'Draft' || status === 'Cancelled';
}
