interface InvoiceRecord {
  id: number;
  issue_date?: string;
  due_date?: string;
  paid_at?: string | null;
  status?: string;
  total?: number;
}

export interface CustomerAnalytics {
  totalInvoices: number;
  totalRevenue: number;
  outstandingAmount: number;
  averageInvoiceAmount: number;
  averageDaysToPay: number;
  onTimePaymentRate: number;
  statusCounts: Record<string, number>;
}

export const calculateDaysBetween = (start?: string | null, end?: string | null): number | null => {
  if (!start || !end) {
    return null;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

export const calculateCustomerAnalytics = (invoices: InvoiceRecord[]): CustomerAnalytics => {
  const totalInvoices = invoices.length;
  const statusCounts: Record<string, number> = {};
  let paidTotal = 0;
  let outstandingAmount = 0;
  let totalRevenue = 0;
  let totalAmount = 0;
  let paidCount = 0;
  let totalDaysToPay = 0;
  let onTimePayments = 0;

  invoices.forEach((invoice) => {
    const status = invoice.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const total = Number(invoice.total || 0);
    totalAmount += total;

    if (status === 'Paid') {
      totalRevenue += total;
      paidTotal += total;
      paidCount += 1;
      const daysToPay = calculateDaysBetween(invoice.issue_date, invoice.paid_at);
      if (daysToPay !== null) {
        totalDaysToPay += daysToPay;
      }
      const isOnTime = calculateDaysBetween(invoice.issue_date, invoice.due_date);
      if (daysToPay !== null && isOnTime !== null && daysToPay <= isOnTime) {
        onTimePayments += 1;
      }
    }

    if (status === 'Sent' || status === 'Overdue') {
      outstandingAmount += total;
    }
  });

  const averageInvoiceAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
  const averageDaysToPay = paidCount > 0 ? totalDaysToPay / paidCount : 0;
  const onTimePaymentRate = paidCount > 0 ? (onTimePayments / paidCount) * 100 : 0;

  return {
    totalInvoices,
    totalRevenue: paidTotal,
    outstandingAmount,
    averageInvoiceAmount,
    averageDaysToPay,
    onTimePaymentRate,
    statusCounts
  };
};

export const groupInvoicesByMonth = (invoices: InvoiceRecord[]) => {
  const buckets: Record<string, number> = {};
  invoices.forEach((invoice) => {
    if (!invoice.issue_date) {
      return;
    }
    const date = new Date(invoice.issue_date);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = (buckets[key] || 0) + Number(invoice.total || 0);
  });
  return Object.entries(buckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));
};
