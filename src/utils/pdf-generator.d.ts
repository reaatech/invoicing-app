export declare function generateInvoicePDF(invoiceData: unknown, outputPath: string): Promise<{
    success: boolean;
    path?: string;
    error?: string;
}>;
export default generateInvoicePDF;
