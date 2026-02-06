// PDF generation utility for renderer process
// Actual PDF generation happens in main process via IPC

export async function generateInvoicePDF(
  invoiceData: unknown, 
  outputPath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    window.electronAPI.sendMessage('generate-pdf', invoiceData, outputPath);
    window.electronAPI.onMessage('pdf-response', (response: unknown) => {
      resolve(response as { success: boolean; path?: string; error?: string });
    });
  });
}

export default generateInvoicePDF;
