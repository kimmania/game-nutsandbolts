import { describe, expect, it, vi } from 'vitest';
import {
  dismissInstallHint,
  isIosBrowser,
  isStandaloneDisplay,
  shouldShowInstallHint,
} from '../src/ui/installHint';

describe('installHint', () => {
  it('detects iOS user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(isIosBrowser()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('hides hint when already installed', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: true }),
    });
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: true,
    });
    expect(isStandaloneDisplay()).toBe(true);
    expect(shouldShowInstallHint()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('respects dismiss in localStorage', () => {
    const store: Record<string, string> = { 'nutsandbolts-install-hint': 'dismissed' };
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(shouldShowInstallHint()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('stores dismiss flag', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
    dismissInstallHint();
    expect(store['nutsandbolts-install-hint']).toBe('dismissed');
    vi.unstubAllGlobals();
  });
});
