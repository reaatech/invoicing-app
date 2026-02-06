interface ElectronAPI {
  sendMessage: (channel: string, ...args: any[]) => void;
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeMessage: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
