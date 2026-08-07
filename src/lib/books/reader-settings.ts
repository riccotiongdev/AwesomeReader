/**
 * Reader preferences (ticket 04): theme + font-size presets for the book
 * reader, persisted so they survive sessions. The reader theme is its own
 * setting (books read differently from news), defaulting to the app's
 * current theme the first time.
 */
import { ReaderTheme } from './folio-adapter';

export const READER_THEME_KEY = 'awesomereader_reader_theme';
export const READER_FONT_KEY = 'awesomereader_reader_font_size';
export const APP_THEME_KEY = 'awesomereader_theme';

export const FONT_SIZE_PRESETS = [85, 100, 115, 130, 150];
export const DEFAULT_FONT_SIZE = 100;

const isReaderTheme = (value: unknown): value is ReaderTheme =>
  value === 'oled' || value === 'sepia' || value === 'light';

export function loadReaderTheme(): ReaderTheme {
  if (typeof window === 'undefined') return 'oled';
  try {
    const saved = window.localStorage.getItem(READER_THEME_KEY);
    if (isReaderTheme(saved)) return saved;
    // First run: follow the app theme, if one is set.
    const appTheme = window.localStorage.getItem(APP_THEME_KEY);
    if (isReaderTheme(appTheme)) return appTheme;
  } catch {
    // fall through to default
  }
  return 'oled';
}

export function saveReaderTheme(theme: ReaderTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(READER_THEME_KEY, theme);
  } catch {
    // storage unavailable — theme just won't persist
  }
}

export function loadReaderFontSize(): number {
  if (typeof window === 'undefined') return DEFAULT_FONT_SIZE;
  try {
    const saved = Number(window.localStorage.getItem(READER_FONT_KEY));
    if (Number.isFinite(saved) && saved >= 50 && saved <= 300) return saved;
  } catch {
    // fall through to default
  }
  return DEFAULT_FONT_SIZE;
}

export function saveReaderFontSize(pct: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(READER_FONT_KEY, String(pct));
  } catch {
    // storage unavailable — size just won't persist
  }
}
