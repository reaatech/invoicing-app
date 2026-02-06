import { FileEdit, Send, CheckCircle, AlertCircle, XCircle, type LucideIcon } from 'lucide-react';

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-gray-500';
    case 'Sent':
      return 'bg-blue-500';
    case 'Paid':
      return 'bg-green-500';
    case 'Overdue':
      return 'bg-red-500';
    case 'Cancelled':
      return 'bg-black';
    default:
      return 'bg-gray-500';
  }
}

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
