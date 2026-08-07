/**
 * Top-level space (ADR-0003): the persistent News|Books choice.
 * Pure logic — the shell (AppShell) owns the state; this module only
 * loads/saves it so the persistence behavior is testable.
 */
export type Space = 'news' | 'books';

export const SPACE_STORAGE_KEY = 'awesomereader_space';

export function loadSpace(): Space {
  if (typeof window === 'undefined') return 'news';
  try {
    const saved = window.localStorage.getItem(SPACE_STORAGE_KEY);
    return saved === 'books' ? 'books' : 'news';
  } catch {
    return 'news';
  }
}

export function saveSpace(space: Space): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SPACE_STORAGE_KEY, space);
  } catch {
    // storage unavailable (private mode / webview) — the choice just won't persist
  }
}
