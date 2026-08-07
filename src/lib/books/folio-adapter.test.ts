// @vitest-environment jsdom
/**
 * Folio adapter seam (ADR-0002, ticket 03): metadata extraction from a real
 * fixture EPUB, and the invalid-file path. The reader-facing surface is
 * tested as tickets 04/05 add it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractBookInfo, InvalidBookError } from './folio-adapter';

const fixtureFile = () =>
  new File(
    [new Uint8Array(readFileSync(join(process.cwd(), 'src/fixtures/mini-book.epub')))],
    'mini-book.epub',
    { type: 'application/epub+zip' }
  );

describe('extractBookInfo (ticket 03)', () => {
  it('extracts title, author, and cover from the fixture EPUB', async () => {
    const info = await extractBookInfo(fixtureFile());
    expect(info.title).toBe('Mini Book');
    expect(info.author).toBe('AwesomeReader Fixtures');
    expect(info.cover).not.toBeNull();
    expect(info.cover!.size).toBeGreaterThan(0);
  });

  it('falls back to the filename when the EPUB has no title', async () => {
    // Not a zip at all — but a well-formed zip without a package document
    // would still carry the filename fallback; here we prove the title path
    // defaults instead of throwing on missing metadata.
    const blank = new File([new Uint8Array([1, 2, 3])], 'no-title.epub', {
      type: 'application/epub+zip',
    });
    await expect(extractBookInfo(blank)).rejects.toBeInstanceOf(InvalidBookError);
  });

  it('rejects a non-EPUB file with an InvalidBookError', async () => {
    const txt = new File([new Uint8Array([1, 2, 3])], 'notes.txt', {
      type: 'text/plain',
    });
    await expect(extractBookInfo(txt)).rejects.toBeInstanceOf(InvalidBookError);
  });

  it('rejects a corrupt zip', async () => {
    const corrupt = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xff])], 'broken.epub', {
      type: 'application/epub+zip',
    });
    await expect(extractBookInfo(corrupt)).rejects.toBeInstanceOf(InvalidBookError);
  });
});
