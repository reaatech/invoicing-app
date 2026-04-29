import type { DbRow } from '../types';

export const isElectronAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export const safeElectronAPI = {
  sendMessage: (channel: string, ...args: unknown[]) => {
    if (isElectronAvailable()) {
      window.electronAPI.sendMessage(channel, ...args);
    } else {
      console.warn(`Electron API not available. Attempted to send message to channel: ${channel}`);
    }
  },

  onMessage: (channel: string, callback: (data: unknown) => void) => {
    if (isElectronAvailable()) {
      window.electronAPI.onMessage(channel, callback);
    } else {
      console.warn(`Electron API not available. Attempted to listen to channel: ${channel}`);
      if (channel === 'database-response') {
        setTimeout(() => {
          callback({ success: true, data: [] } satisfies DbRow);
        }, 100);
      }
    }
  },
  removeMessage: (channel: string, callback: (data: unknown) => void) => {
    if (isElectronAvailable()) {
      window.electronAPI.removeMessage(channel, callback);
    }
  },
};

export const showSaveDialog = (options: {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}) => {
  return new Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string | null;
    error?: string;
  }>((resolve) => {
    if (!isElectronAvailable()) {
      resolve({ success: false, error: 'Electron API not available' });
      return;
    }
    const handler = (response: unknown) => {
      safeElectronAPI.removeMessage('show-save-dialog-response', handler);
      resolve(
        response as {
          success: boolean;
          canceled?: boolean;
          filePath?: string | null;
          error?: string;
        },
      );
    };
    safeElectronAPI.onMessage('show-save-dialog-response', handler);
    safeElectronAPI.sendMessage('show-save-dialog', options);
  });
};
