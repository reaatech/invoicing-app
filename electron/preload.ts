import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel: string, ...data: unknown[]) => {
    const validChannels = ['database-query', 'settings-save', 'invoice-send', 'generate-pdf', 'export-data', 'import-data', 'get-next-invoice-number', 'show-save-dialog', 'show-open-dialog', 'upload-attachment', 'delete-attachment'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...data);
    }
  },
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ['database-response', 'settings-response', 'invoice-response', 'pdf-response', 'export-response', 'import-response', 'invoice-number-response', 'show-save-dialog-response', 'show-open-dialog-response', 'upload-attachment-response', 'delete-attachment-response'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  removeMessage: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ['database-response', 'settings-response', 'invoice-response', 'pdf-response', 'export-response', 'import-response', 'invoice-number-response', 'show-save-dialog-response', 'show-open-dialog-response', 'upload-attachment-response', 'delete-attachment-response'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback as (...args: unknown[]) => void);
    }
  }
});
