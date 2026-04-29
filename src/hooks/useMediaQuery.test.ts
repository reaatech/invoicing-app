import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '../hooks/useMediaQuery';

describe('useMediaQuery', () => {
  let listeners: Array<() => void> = [];
  let currentMatches = false;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    window.matchMedia = vi.fn((_query: string) => {
      const listenersRef = listeners;
      return {
        get matches() {
          return currentMatches;
        },
        media: _query,
        addEventListener: (_event: string, listener: () => void) => {
          listenersRef.push(listener);
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const idx = listenersRef.indexOf(listener);
          if (idx >= 0) listenersRef.splice(idx, 1);
        },
      } as MediaQueryList;
    });
  });

  it('returns initial match state', () => {
    currentMatches = true;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when query does not match', () => {
    currentMatches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1200px)'));
    expect(result.current).toBe(false);
  });

  it('updates when media query changes', () => {
    currentMatches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      listeners.forEach((l) => l());
    });

    expect(result.current).toBe(true);
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(listeners.length).toBe(1);

    unmount();
    expect(listeners.length).toBe(0);
  });
});

describe('useIsMobile', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(
      (query: string) =>
        ({
          matches: query === '(max-width: 767px)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  it('returns true when max-width 767 matches', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

describe('useIsTablet', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(
      (query: string) =>
        ({
          matches: query === '(min-width: 768px) and (max-width: 1023px)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  it('returns true when tablet query matches', () => {
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });
});

describe('useIsDesktop', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(
      (query: string) =>
        ({
          matches: query === '(min-width: 1024px)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  it('returns true when desktop query matches', () => {
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('returns false when desktop query does not match', () => {
    window.matchMedia = vi.fn(
      () =>
        ({
          matches: false,
          media: '(min-width: 1024px)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
