import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isElectronAvailable, safeElectronAPI, showSaveDialog } from './electron-api';

describe('isElectronAvailable', () => {
  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).electronAPI;
  });

  it('returns true when electronAPI exists on window', () => {
    (window as unknown as Record<string, unknown>).electronAPI = {
      sendMessage: vi.fn(),
      onMessage: vi.fn(),
      removeMessage: vi.fn(),
    };
    expect(isElectronAvailable()).toBe(true);
  });

  it('returns false when electronAPI is undefined', () => {
    expect(isElectronAvailable()).toBe(false);
  });

  it('returns false when window is undefined', () => {
    const originalWindow = globalThis.window;
    delete (globalThis as unknown as Record<string, unknown>).window;
    vi.resetModules();
    (globalThis as unknown as Record<string, unknown>).window = originalWindow;
  });
});

describe('safeElectronAPI', () => {
  let mockApi: {
    sendMessage: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    removeMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApi = {
      sendMessage: vi.fn(),
      onMessage: vi.fn(),
      removeMessage: vi.fn(),
    };
    (window as unknown as Record<string, unknown>).electronAPI = mockApi;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendMessage', () => {
    it('calls window.electronAPI.sendMessage when available', () => {
      safeElectronAPI.sendMessage('test-channel', 'arg1', 42);
      expect(mockApi.sendMessage).toHaveBeenCalledWith('test-channel', 'arg1', 42);
    });

    it('does not throw when electronAPI is not available', () => {
      delete (window as unknown as Record<string, unknown>).electronAPI;
      expect(() => safeElectronAPI.sendMessage('test-channel', 'data')).not.toThrow();
    });
  });

  describe('onMessage', () => {
    it('calls window.electronAPI.onMessage when available', () => {
      const callback = vi.fn();
      safeElectronAPI.onMessage('test-channel', callback);
      expect(mockApi.onMessage).toHaveBeenCalledWith('test-channel', callback);
    });

    it('provides mock data for database-response channel when electronAPI unavailable', () => {
      vi.useFakeTimers();
      delete (window as unknown as Record<string, unknown>).electronAPI;
      const callback = vi.fn();
      safeElectronAPI.onMessage('database-response', callback);
      vi.runAllTimers();
      expect(callback).toHaveBeenCalledWith({ success: true, data: [] });
    });
  });

  describe('removeMessage', () => {
    it('calls window.electronAPI.removeMessage when available', () => {
      const callback = vi.fn();
      safeElectronAPI.removeMessage('test-channel', callback);
      expect(mockApi.removeMessage).toHaveBeenCalledWith('test-channel', callback);
    });

    it('does not throw when electronAPI is not available', () => {
      delete (window as unknown as Record<string, unknown>).electronAPI;
      expect(() => safeElectronAPI.removeMessage('test-channel', vi.fn())).not.toThrow();
    });
  });
});

describe('showSaveDialog', () => {
  let mockApi: {
    sendMessage: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    removeMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApi = {
      sendMessage: vi.fn(),
      onMessage: vi.fn(),
      removeMessage: vi.fn(),
    };
    (window as unknown as Record<string, unknown>).electronAPI = mockApi;
  });

  it('resolves with success when dialog response succeeds', async () => {
    mockApi.onMessage.mockImplementation((_channel: string, callback: (data: unknown) => void) => {
      setTimeout(() => callback({ success: true, filePath: '/path/to/file.pdf' }), 0);
    });

    const result = await showSaveDialog({
      title: 'Save PDF',
      defaultPath: 'invoice.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/path/to/file.pdf');
  });

  it('resolves with error when dialog fails', async () => {
    mockApi.onMessage.mockImplementation((_channel: string, callback: (data: unknown) => void) => {
      setTimeout(() => callback({ success: false, error: 'User cancelled' }), 0);
    });

    const result = await showSaveDialog({ title: 'Save' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('User cancelled');
  });

  it('returns error when electronAPI is not available', async () => {
    delete (window as unknown as Record<string, unknown>).electronAPI;

    const result = await showSaveDialog({ title: 'Save' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Electron API not available');
  });
});
