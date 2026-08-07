/**
 * Folio adapter — the single seam between the app and foliate-js (ADR-0002).
 * UI code must never import foliate-js directly; this module owns all engine
 * interaction.
 *
 * Ticket 03 slice: metadata extraction for import. The reader-facing surface
 * (openBook, goTo, themes, location save/restore) is added by tickets 04/05.
 */
import { makeBook } from 'foliate-js/view.js';

export interface BookInfo {
  title: string;
  author: string | null;
  cover: Blob | null;
}

/** Thrown when a picked file is not a readable EPUB. */
export class InvalidBookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBookError';
  }
}

/**
 * Normalizes foliate-js metadata.author: a plain string for a single author,
 * an array of name strings for several (tidy() collapses {name} and unwraps
 * length-1 arrays — see ticket 01 spike notes).
 */
const normalizeAuthor = (author: unknown): string | null => {
  if (!author) return null;
  const parts = Array.isArray(author) ? author : [author];
  const display = parts.filter(Boolean).map(String).join(', ').trim();
  return display || null;
};

/**
 * Extracts import metadata from an EPUB file. Parses via the same path the
 * reader uses (makeBook), so an invalid file fails here — before anything is
 * written to the store (no partial records).
 */
export async function extractBookInfo(file: File): Promise<BookInfo> {
  let book: any;
  try {
    book = await makeBook(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new InvalidBookError(`Not a readable EPUB (${message})`);
  }

  let cover: Blob | null = null;
  try {
    cover = (await book.getCover?.()) ?? null;
  } catch {
    cover = null; // a broken cover must never fail the import
  }

  const rawTitle = book.metadata?.title;
  const title =
    (typeof rawTitle === 'string' ? rawTitle.trim() : '') ||
    file.name.replace(/\.epub$/i, '') ||
    'Untitled';

  return {
    title,
    author: normalizeAuthor(book.metadata?.author),
    cover,
  };
}

// ===== Reader surface (ticket 04) =====

export type ReaderTheme = 'oled' | 'sepia' | 'light';

export interface TocItem {
  label: string;
  href: string | null;
  subitems: TocItem[] | null;
}

/** Serializable reading position (ticket 05). */
export interface BookLocation {
  cfi: string | null;
  fraction: number | null;
}

/**
 * Extracts the persistable subset of a foliate-js relocate detail. The raw
 * detail also carries a DOM Range and section/time bookkeeping that is not
 * JSON-serializable (and not needed across sessions).
 */
export function locationToSerializable(detail: any): BookLocation {
  return {
    cfi: typeof detail?.cfi === 'string' ? detail.cfi : null,
    fraction: typeof detail?.fraction === 'number' ? detail.fraction : null,
  };
}

/**
 * The target to hand foliate-js for resuming: the exact CFI when we have one,
 * else the approximate fraction, else undefined (start from the top).
 */
export function resolveInitialLocation(saved: BookLocation | null | undefined): any {
  if (saved?.cfi) return saved.cfi;
  if (saved?.fraction != null) return { fraction: saved.fraction };
  return undefined;
}

/** Same three palettes as the app's themes, for the book viewport. */
export const READER_THEME_CSS: Record<ReaderTheme, string> = {
  oled: 'body { background: #000 !important; color: #c9c9c9 !important; }',
  sepia: 'body { background: #f4ecd8 !important; color: #433422 !important; }',
  light: 'body { background: #fff !important; color: #1a1a1a !important; }',
};

/** CSS injected into the book viewport: theme + font size. */
export function buildReaderCss(theme: ReaderTheme, fontSizePct: number): string {
  return (
    READER_THEME_CSS[theme] +
    ` p, h1, h2, h3, h4, li, blockquote { font-size: ${fontSizePct}% !important; }`
  );
}

/** Maps foliate-js nav items to our stable TocItem shape. */
export function tocToItems(toc: any[] | undefined | null): TocItem[] {
  if (!toc) return [];
  return toc.map((item) => ({
    label: item.label ?? '',
    href: item.href ?? null,
    subitems: item.subitems ? tocToItems(item.subitems) : null,
  }));
}

/**
 * An open reading session: a mounted <foliate-view> rendering one book.
 * Owns all foliate-js interaction for the reader (ADR-0002). Created with
 * open(), torn down with close(). Ticket 05 adds location save/restore here.
 */
export class ReaderSession {
  private view: any = null;
  private element: HTMLElement | null = null;
  private location: BookLocation | null = null;
  /** Called on every relocate (page turn / TOC jump) with the serializable position. */
  onRelocate: ((location: BookLocation) => void) | null = null;

  private constructor(private container: HTMLElement) {}

  static async open(
    container: HTMLElement,
    file: File | Blob,
    initialLocation?: BookLocation | null
  ): Promise<ReaderSession> {
    await import('foliate-js/view.js');
    const session = new ReaderSession(container);
    const view = document.createElement('foliate-view');
    view.style.cssText = 'display:block;width:100%;height:100%;';
    container.append(view);
    session.view = view as any;
    session.element = view;
    (view as any).addEventListener('relocate', (e: { detail: any }) => {
      session.location = locationToSerializable(e.detail);
      session.onRelocate?.(session.location);
    });
    try {
      await session.view.open(file);
      await session.view.init({ lastLocation: resolveInitialLocation(initialLocation) });
    } catch (err) {
      session.close();
      throw err;
    }
    return session;
  }

  get toc(): TocItem[] {
    return tocToItems(this.view?.book?.toc);
  }

  get title(): string {
    return this.view?.book?.metadata?.title ?? '';
  }

  /** The most recent reading position, or null before the first relocate. */
  get currentLocation(): BookLocation | null {
    return this.location;
  }

  async setStyles(css: string): Promise<void> {
    await this.view?.renderer?.setStyles(css);
  }

  async goTo(target: string): Promise<void> {
    await this.view?.goTo(target);
  }

  async next(): Promise<void> {
    await this.view?.next();
  }

  async prev(): Promise<void> {
    await this.view?.prev();
  }

  close(): void {
    try {
      this.view?.close?.();
    } catch {
      // engine teardown failure must not mask anything
    }
    this.element?.remove();
    this.element = null;
    this.view = null;
  }
}
