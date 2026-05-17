import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadExportedData, readImportFile } from './export';

describe('downloadExportedData', () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('creates a download link and clicks it', () => {
    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, _options?: ElementCreationOptions) => {
        const el = originalCreateElement(tag, _options);
        if (tag === 'a') {
          (el as HTMLAnchorElement).click = clickSpy;
        }
        return el;
      },
    );

    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    downloadExportedData('{"test": true}', 'test.json');

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('uses default filename when none provided', () => {
    const linkRef: { current: HTMLAnchorElement | null } = { current: null };

    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, _options?: ElementCreationOptions) => {
        const el = originalCreateElement(tag, _options);
        if (tag === 'a') {
          el.click = vi.fn();
          linkRef.current = el as HTMLAnchorElement;
        }
        return el;
      },
    );

    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    downloadExportedData('{}');

    expect(linkRef.current?.download).toBe('invoicing-data-export.json');
  });
});

describe('readImportFile', () => {
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    originalFileReader = window.FileReader;
  });

  afterEach(() => {
    window.FileReader = originalFileReader;
  });

  it('reads a file and resolves with its content', async () => {
    const content = '{"key": "value"}';
    const file = new File([content], 'test.json', { type: 'application/json' });

    const result = await readImportFile(file);
    expect(result).toBe(content);
  });

  it('rejects when FileReader errors', async () => {
    const file = new File([''], 'test.json', { type: 'application/json' });

    window.FileReader = vi.fn().mockImplementation(function (this: FileReader) {
      Object.assign(this, {
        readAsText: vi.fn(),
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        result: null as string | null,
      });
    }) as unknown as typeof FileReader;

    const promise = readImportFile(file);
    const mockResults = (window.FileReader as unknown as ReturnType<typeof vi.fn>).mock.results[0];
    const mockReader = mockResults.value as {
      onerror: (() => void) | null;
    };

    if (mockReader.onerror) {
      mockReader.onerror();
    }

    await expect(promise).rejects.toThrow('Failed to read file');
  });

  it('reads non-empty file content', async () => {
    const content = 'hello world';
    const file = new File([content], 'data.txt', { type: 'text/plain' });

    const result = await readImportFile(file);
    expect(result).toBe(content);
  });
});
