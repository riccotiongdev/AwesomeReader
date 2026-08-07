import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { AwesomeReaderDB } from '@/lib/db/dexie-db';

/**
 * Book store seam (ticket 03): the Dexie books table helpers, tested exactly
 * like dexie-db.test.ts (fake-indexeddb). Native node Blobs stand in for the
 * browser File/Blob the app stores — see the ticket 01 spike notes on why
 * fake-indexeddb cannot clone jsdom Files.
 */
describe('books table (ticket 03)', () => {
  let db: AwesomeReaderDB;

  const blob = (n: number): Blob =>
    new NodeBlob([new Uint8Array([n, n, n])], { type: 'application/epub+zip' }) as unknown as Blob;

  beforeEach(async () => {
    db = new AwesomeReaderDB();
    await db.books.clear();
    await db.articles.clear();
    await db.feeds.clear();
    await db.folders.clear();
  });

  it('adds a book and lists it most-recently-imported first', async () => {
    await db.addBook({ blob: blob(1), title: 'First', author: 'Alice' });
    await db.addBook({ blob: blob(2), title: 'Second', author: 'Bob' });

    const books = await db.getBooks();
    expect(books.map((b) => b.title)).toEqual(['Second', 'First']);
    expect(books[0].progress).toBeNull();
    expect(books[0].location).toBeNull();
  });

  it('returns the stored blob for a book', async () => {
    const book = await db.addBook({ blob: blob(7), title: 'Blobby', author: null });
    const stored = await db.getBookBlob(book.id);
    expect(stored).not.toBeNull();
    expect(stored!.size).toBe(3);
    expect(await stored!.arrayBuffer()).toEqual(new Uint8Array([7, 7, 7]).buffer);
  });

  it('returns null blob for an unknown book', async () => {
    expect(await db.getBookBlob('nope')).toBeNull();
  });

  it('detects duplicates by normalized title + author', async () => {
    await db.addBook({ blob: blob(1), title: '  Mini Book ', author: 'AwesomeReader Fixtures' });

    expect(await db.findBookByTitleAuthor('mini book', 'awesomeReader fixtures')).not.toBeNull();
    expect(await db.findBookByTitleAuthor('mini book', 'Someone Else')).toBeNull();
    expect(await db.findBookByTitleAuthor('Other Book', 'AwesomeReader Fixtures')).toBeNull();
  });

  it('detects duplicates by title alone when both are authorless', async () => {
    await db.addBook({ blob: blob(1), title: 'Anonymous', author: null });
    expect(await db.findBookByTitleAuthor('anonymous', null)).not.toBeNull();
  });

  it('deletes a book and its record', async () => {
    const book = await db.addBook({ blob: blob(1), title: 'Gone', author: null });
    await db.deleteBook(book.id);
    expect(await db.getBooks()).toHaveLength(0);
    expect(await db.getBookBlob(book.id)).toBeNull();
  });

  it('updates and reads back reading progress', async () => {
    const book = await db.addBook({ blob: blob(1), title: 'Progress', author: null });
    expect(await db.getBookProgress(book.id)).toEqual({ location: null, progress: null });

    await db.updateBookProgress(book.id, { location: 'epubcfi(/6/4)', progress: 0.42 });
    expect(await db.getBookProgress(book.id)).toEqual({
      location: 'epubcfi(/6/4)',
      progress: 0.42,
    });
  });

  it('partial progress updates do not clobber the other field', async () => {
    const book = await db.addBook({ blob: blob(1), title: 'Partial', author: null });
    await db.updateBookProgress(book.id, { location: 'epubcfi(/6/4)' });
    await db.updateBookProgress(book.id, { progress: 0.9 });
    expect(await db.getBookProgress(book.id)).toEqual({
      location: 'epubcfi(/6/4)',
      progress: 0.9,
    });
  });

  it('marks a finished book complete (progress 1, location cleared)', async () => {
    const book = await db.addBook({ blob: blob(1), title: 'Finished', author: null });
    await db.updateBookProgress(book.id, { location: 'epubcfi(/6/9)', progress: 0.7 });
    await db.updateBookProgress(book.id, { location: null, progress: 1 });
    expect(await db.getBookProgress(book.id)).toEqual({ location: null, progress: 1 });
  });

  it('returns null progress for an unknown book', async () => {
    expect(await db.getBookProgress('nope')).toBeNull();
  });
});
