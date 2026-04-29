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
export declare const calculateDaysBetween: (start?: string | null, end?: string | null) => number | null;
export declare const calculateCustomerAnalytics: (invoices: InvoiceRecord[]) => CustomerAnalytics;
export declare const groupInvoicesByMonth: (invoices: InvoiceRecord[]) => {
    month: string;
    total: number;
}[];
export {};
