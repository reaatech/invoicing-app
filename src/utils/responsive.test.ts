import { describe, it, expect, afterEach } from 'vitest';
import { isMobile, isTablet, isDesktop } from './responsive';

describe('isMobile', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
  });

  it('returns true when width is below 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 767,
    });
    expect(isMobile()).toBe(true);
  });

  it('returns false when width is exactly 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 768,
    });
    expect(isMobile()).toBe(false);
  });

  it('returns false when width is above 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
    expect(isMobile()).toBe(false);
  });

  it('returns true for very small widths', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 320,
    });
    expect(isMobile()).toBe(true);
  });
});

describe('isTablet', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
  });

  it('returns true when width is between 768 and 1023', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 800,
    });
    expect(isTablet()).toBe(true);
  });

  it('returns true at lower bound (768)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 768,
    });
    expect(isTablet()).toBe(true);
  });

  it('returns true at upper bound (1023)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1023,
    });
    expect(isTablet()).toBe(true);
  });

  it('returns false below 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 767,
    });
    expect(isTablet()).toBe(false);
  });

  it('returns false at 1024 and above', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
    expect(isTablet()).toBe(false);
  });
});

describe('isDesktop', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
  });

  it('returns true when width is exactly 1024', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
    expect(isDesktop()).toBe(true);
  });

  it('returns true when width is above 1024', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1920,
    });
    expect(isDesktop()).toBe(true);
  });

  it('returns false when width is below 1024', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1023,
    });
    expect(isDesktop()).toBe(false);
  });

  it('returns false for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375,
    });
    expect(isDesktop()).toBe(false);
  });
});
