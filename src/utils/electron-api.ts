// Helper to check if Electron API is available
export const isElectronAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// Safe wrapper for Electron API calls
export const safeElectronAPI = {
  sendMessage: (channel: string, ...args: any[]) => {
    if (isElectronAvailable()) {
      window.electronAPI.sendMessage(channel, ...args);
    } else {
      console.warn(`Electron API not available. Attempted to send message to channel: ${channel}`);
    }
  },
  
  onMessage: (channel: string, callback: (data: any) => void) => {
    if (isElectronAvailable()) {
      window.electronAPI.onMessage(channel, callback);
    } else {
      console.warn(`Electron API not available. Attempted to listen to channel: ${channel}`);
      // Return mock data for development
      if (channel === 'database-response') {
        setTimeout(() => {
          callback({ success: true, data: [] });
        }, 100);
      }
    }
  },
  removeMessage: (channel: string, callback: (data: any) => void) => {
    if (isElectronAvailable()) {
      window.electronAPI.removeMessage(channel, callback);
    }
  }
};

export const showSaveDialog = (options: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
  return new Promise<{ success: boolean; canceled?: boolean; filePath?: string | null; error?: string }>((resolve) => {
    if (!isElectronAvailable()) {
      resolve({ success: false, error: 'Electron API not available' });
      return;
    }
    const handler = (response: unknown) => {
      window.electronAPI.removeMessage('show-save-dialog-response', handler);
      resolve(response as { success: boolean; canceled?: boolean; filePath?: string | null; error?: string });
    };
    window.electronAPI.onMessage('show-save-dialog-response', handler);
    window.electronAPI.sendMessage('show-save-dialog', options);
  });
};
