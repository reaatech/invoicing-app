import '../types';
export declare const api: {
    query: (sql: string, params?: unknown[]) => Promise<{
        success: boolean;
        data?: unknown[];
        error?: string;
    }>;
    saveSettings: (settings: unknown) => Promise<{
        success: boolean;
        error?: string;
    }>;
    sendInvoice: (invoiceId: number, recipientEmail: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    generatePDF: (invoiceData: unknown, outputPath: string) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
    }>;
    exportData: () => Promise<{
        success: boolean;
        data?: string;
        error?: string;
    }>;
    importData: (jsonData: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    getNextInvoiceNumber: () => Promise<{
        success: boolean;
        invoiceNumber?: string;
        error?: string;
    }>;
};
