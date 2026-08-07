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
