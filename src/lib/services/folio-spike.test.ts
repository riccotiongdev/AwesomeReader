// @vitest-environment jsdom
/**
 * Ticket 01 spike evidence: does foliate-js parse a real EPUB from a blob,
 * and does an EPUB blob survive an IndexedDB round-trip and re-parse?
 *
 * This exercises the exact code path `view.open()` uses for parsing
 * (makeBook -> vendored zip.js -> EPUB.init -> DOMParser), minus rendering,
 * which requires a real layout engine and is verified manually on device.
 *
 * Spike findings so far (see ticket 01 for the full record):
 * - metadata.author is a plain string for a single author; an array of name
 *   strings for multiple (tidy() collapses {name} and unwraps length-1 arrays).
 *   Normalize with [].concat(author).filter(Boolean).join(', ').
 * - fake-indexeddb (via node's structuredClone) cannot clone jsdom Files —
 *   they come back as empty objects. The round-trip test therefore uses a
 *   native node:buffer Blob. Real-WebView blob persistence is a manual
 *   acceptance criterion on the ticket.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Blob as NodeBlob } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { makeBook } from 'foliate-js/view.js';

const fixtureBytes = readFileSync(join(process.cwd(), 'src/fixtures/mini-book.epub'));

const fixtureFile = () =>
  new File([new Uint8Array(fixtureBytes)], 'mini-book.epub', {
    type: 'application/epub+zip',
  });

/** A File-shaped object wrapping a native node Blob (makeBook needs .name). */
const fileLike = (blob: Blob) => ({
  name: 'mini-book.epub',
  type: 'application/epub+zip',
  size: blob.size,
  slice: (start?: number, end?: number) => blob.slice(start, end),
  arrayBuffer: () => blob.arrayBuffer(),
});

describe('foliate-js parse of fixture EPUB', () => {
  it('extracts metadata from the OPF', async () => {
    const book = await makeBook(fixtureFile());
    expect(book.metadata.title).toBe('Mini Book');
    expect(book.metadata.author).toBe('AwesomeReader Fixtures');
    expect(book.metadata.language).toBe('en');
  });

  it('reads the table of contents and spine sections', async () => {
    const book = await makeBook(fixtureFile());
    expect(book.toc.length).toBe(3);
    expect(book.toc.map((item: { label: string }) => item.label)).toEqual([
      'Chapter 1',
      'Chapter 2',
      'Chapter 3',
    ]);
    expect(book.sections.length).toBe(3);
  });

  it('round-trips a native book blob through IndexedDB and re-parses it', async () => {
    const db = new Dexie('spike-blob-roundtrip');
    db.version(1).stores({ books: 'id' });
    const id = 'book-1';
    const blob = new NodeBlob([new Uint8Array(fixtureBytes)], {
      type: 'application/epub+zip',
    });
    await db.table('books').put({ id, blob });

    const stored = await db.table('books').get(id);
    expect(stored.blob.size).toBe(fixtureBytes.byteLength);

    const book = await makeBook(fileLike(stored.blob));
    expect(book.metadata.title).toBe('Mini Book');
    expect(book.sections.length).toBe(3);

    await db.delete();
  });
});
