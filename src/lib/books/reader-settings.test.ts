import { describe, expect, it, beforeEach } from 'vitest';
import {
  loadReaderTheme,
  saveReaderTheme,
  loadReaderFontSize,
  saveReaderFontSize,
  READER_THEME_KEY,
  READER_FONT_KEY,
  APP_THEME_KEY,
} from './reader-settings';

const store = new Map<string, string>();

function installStorage() {
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    },
  };
}

beforeEach(() => {
  store.clear();
  installStorage();
});

describe('reader theme (ticket 04)', () => {
  it('defaults to oled with no saved theme', () => {
    expect(loadReaderTheme()).toBe('oled');
  });

  it('follows the app theme on first run', () => {
    store.set(APP_THEME_KEY, 'sepia');
    expect(loadReaderTheme()).toBe('sepia');
  });

  it('prefers the saved reader theme over the app theme', () => {
    store.set(APP_THEME_KEY, 'sepia');
    store.set(READER_THEME_KEY, 'light');
    expect(loadReaderTheme()).toBe('light');
  });

  it('ignores garbage and falls back', () => {
    store.set(READER_THEME_KEY, 'neon');
    expect(loadReaderTheme()).toBe('oled');
  });

  it('round-trips a saved theme', () => {
    saveReaderTheme('sepia');
    expect(store.get(READER_THEME_KEY)).toBe('sepia');
    expect(loadReaderTheme()).toBe('sepia');
  });
});

describe('reader font size (ticket 04)', () => {
  it('defaults to 100', () => {
    expect(loadReaderFontSize()).toBe(100);
  });

  it('round-trips a saved size', () => {
    saveReaderFontSize(130);
    expect(store.get(READER_FONT_KEY)).toBe('130');
    expect(loadReaderFontSize()).toBe(130);
  });

  it('ignores out-of-range and non-numeric values', () => {
    store.set(READER_FONT_KEY, '10'); // too small
    expect(loadReaderFontSize()).toBe(100);
    store.set(READER_FONT_KEY, 'banana');
    expect(loadReaderFontSize()).toBe(100);
  });
});
