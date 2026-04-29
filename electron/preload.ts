import { contextBridge, ipcRenderer } from 'electron';

const validSendChannels = [
  'database-query',
  'settings-save',
  'invoice-send',
  'generate-pdf',
  'export-data',
  'import-data',
  'get-next-invoice-number',
  'show-save-dialog',
  'show-open-dialog',
  'upload-attachment',
  'delete-attachment',
];
const validReceiveChannels = [
  'database-response',
  'settings-response',
  'invoice-response',
  'pdf-response',
  'export-response',
  'import-response',
  'invoice-number-response',
  'show-save-dialog-response',
  'show-open-dialog-response',
  'upload-attachment-response',
  'delete-attachment-response',
];

// Map original callbacks to their ipcRenderer wrappers so removeListener works correctly
const listenerMap = new Map<(...args: unknown[]) => void, (...args: unknown[]) => void>();

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel: string, ...data: unknown[]) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...data);
    }
  },
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => {
    if (validReceiveChannels.includes(channel)) {
      const wrapper = (_: unknown, ...args: unknown[]) => callback(...args);
      listenerMap.set(callback, wrapper);
      ipcRenderer.on(channel, wrapper);
    }
  },
  removeMessage: (channel: string, callback: (...args: unknown[]) => void) => {
    if (validReceiveChannels.includes(channel)) {
      const wrapper = listenerMap.get(callback);
      if (wrapper) {
        ipcRenderer.removeListener(channel, wrapper);
        listenerMap.delete(callback);
      }
    }
  },
});
