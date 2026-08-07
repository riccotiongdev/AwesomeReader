import { describe, expect, it, beforeEach } from 'vitest';
import { loadSpace, saveSpace, SPACE_STORAGE_KEY, Space } from './space-mode';

/**
 * In-memory localStorage stub (node test env has no localStorage).
 * Mirrors the Web Storage API surface the module uses.
 */
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

describe('space-mode persistence (ticket 02)', () => {
  it('defaults to news when nothing has been saved', () => {
    expect(loadSpace()).toBe('news');
  });

  it('loads books when that was the last-used space', () => {
    store.set(SPACE_STORAGE_KEY, 'books');
    expect(loadSpace()).toBe('books');
  });

  it('ignores unknown values and falls back to news', () => {
    store.set(SPACE_STORAGE_KEY, 'podcasts');
    expect(loadSpace()).toBe('news');
  });

  it('round-trips a saved space', () => {
    saveSpace('books');
    expect(store.get(SPACE_STORAGE_KEY)).toBe('books');
    expect(loadSpace()).toBe('books');

    saveSpace('news');
    expect(loadSpace()).toBe('news');
  });

  it('falls back to news when storage is unavailable', () => {
    (globalThis as any).window = {
      localStorage: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('denied');
        },
      },
    };
    expect(loadSpace()).toBe('news');
    expect(() => saveSpace('books' as Space)).not.toThrow();
  });
});
