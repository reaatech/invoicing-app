// API service for communicating with Electron main process
// The actual IPC bridge is set up in electron/preload.ts
import { isElectronAvailable, safeElectronAPI } from '../utils/electron-api';
import '../types';

const pendingDbRequests = new Map<string, {
  resolve: (value: { success: boolean; data?: unknown[]; error?: string }) => void;
  reject: (reason: { success: boolean; error?: string }) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}>();

let dbListenerInitialized = false;

const ensureDbListener = () => {
  if (dbListenerInitialized) {
    return;
  }
  dbListenerInitialized = true;
  safeElectronAPI.onMessage('database-response', (response: unknown) => {
    const typedResponse = response as { requestId?: string };
    if (!typedResponse.requestId) {
      return;
    }
    const pending = pendingDbRequests.get(typedResponse.requestId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timeoutId);
    pendingDbRequests.delete(typedResponse.requestId);
    pending.resolve(response as { success: boolean; data?: unknown[]; error?: string });
  });
};

export const api = {
  query: (sql: string, params: unknown[] = []): Promise<{ success: boolean; data?: unknown[]; error?: string }> => {
    return new Promise((resolve, reject) => {
      ensureDbListener();
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeoutId = setTimeout(() => {
        pendingDbRequests.delete(requestId);
        reject({ success: false, error: 'IPC request timed out after 5000ms' });
      }, 5000);
      pendingDbRequests.set(requestId, { resolve, reject, timeoutId });
      safeElectronAPI.sendMessage('database-query', sql, params, requestId);
    });
  },

  saveSettings: (settings: unknown): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        safeElectronAPI.removeMessage('settings-response', handler);
        reject({ success: false, error: 'IPC request timed out after 5000ms' });
      }, 5000);
      safeElectronAPI.sendMessage('settings-save', settings);
      const handler = (response: unknown) => {
        clearTimeout(timeoutId);
        safeElectronAPI.removeMessage('settings-response', handler);
        resolve(response as { success: boolean; error?: string });
      };
      safeElectronAPI.onMessage('settings-response', handler);
    });
  },

  sendInvoice: (invoiceId: number, recipientEmail: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve, reject) => {
      if (!isElectronAvailable()) {
        reject(new Error('Electron IPC is not available. Send invoices from the desktop app.'));
        return;
      }
      const handler = (response: unknown) => {
        clearTimeout(timeoutId);
        safeElectronAPI.removeMessage('invoice-response', handler);
        resolve(response as { success: boolean; error?: string });
      };
      const timeoutId = setTimeout(() => {
        safeElectronAPI.removeMessage('invoice-response', handler);
        reject(new Error('IPC request timed out after 60000ms'));
      }, 60000);
      safeElectronAPI.onMessage('invoice-response', handler);
      safeElectronAPI.sendMessage('invoice-send', invoiceId, recipientEmail);
    });
  },

  generatePDF: (invoiceData: unknown, outputPath: string): Promise<{ success: boolean; path?: string; error?: string }> => {
    return new Promise((resolve, reject) => {
      const handler = (response: unknown) => {
        clearTimeout(timeoutId);
        safeElectronAPI.removeMessage('pdf-response', handler);
        resolve(response as { success: boolean; path?: string; error?: string });
      };
      const timeoutId = setTimeout(() => {
        safeElectronAPI.removeMessage('pdf-response', handler);
        reject({ success: false, error: 'IPC request timed out after 10000ms' });
      }, 10000);
      safeElectronAPI.onMessage('pdf-response', handler);
      safeElectronAPI.sendMessage('generate-pdf', invoiceData, outputPath);
    });
  },

  exportData: (): Promise<{ success: boolean; data?: string; error?: string }> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        safeElectronAPI.removeMessage('export-response', handler);
        reject({ success: false, error: 'IPC request timed out after 10000ms' });
      }, 10000);
      safeElectronAPI.sendMessage('export-data');
      const handler = (response: unknown) => {
        clearTimeout(timeoutId);
        safeElectronAPI.removeMessage('export-response', handler);
        resolve(response as { success: boolean; data?: string; error?: string });
      };
      safeElectronAPI.onMessage('export-response', handler);
    });
  },

  importData: (jsonData: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        safeElectronAPI.removeMessage('import-response', handler);
        reject({ success: false, error: 'IPC request timed out after 10000ms' });
      }, 10000);
      safeElectronAPI.sendMessage('import-data', jsonData);
      const handler = (response: unknown) => {
        clearTimeout(timeoutId);
        safeElectronAPI.removeMessage('import-response', handler);
        resolve(response as { success: boolean; error?: string });
      };
      safeElectronAPI.onMessage('import-response', handler);
    });
  },

  getNextInvoiceNumber: (): Promise<{ success: boolean; invoiceNumber?: string; error?: string }> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        safeElectronAPI.removeMessage('invoice-number-response', handler);
        reject({ success: false, error: 'IPC request timed out after 5000ms' });
      }, 5000);
      safeElectronAPI.sendMessage('get-next-invoice-number');
      const handler = (response: unknown) => {
        clearTimeout(timeoutId);
        safeElectronAPI.removeMessage('invoice-number-response', handler);
        resolve(response as { success: boolean; invoiceNumber?: string; error?: string });
      };
      safeElectronAPI.onMessage('invoice-number-response', handler);
    });
  }
};
