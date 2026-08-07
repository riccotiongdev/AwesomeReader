# 03 — Import + shelf

**What to build:** The book store and its import path. A user taps Import on the Books shelf, picks an EPUB from device storage (web file input; `@capacitor/filesystem` as fallback if the picker misbehaves on Android), and the book is stored as a blob in Dexie with metadata (title, author, cover) extracted via the folio adapter (ticket 01's engine). The shelf lists imported books with cover, title, and author. Invalid files show a friendly error. Importing a duplicate (same normalized title+author) prompts confirm-replace. A delete affordance on each book confirms and removes the book and its blob. Empty shelf shows an import call-to-action.

**Blocked by:** 01 (Spike: foliate-js in the Capacitor WebView), 02 (Books space shell).

**Status:** resolved

## Answer

Implemented and committed (`d243a21`).

- **Folio adapter seam** (`src/lib/books/folio-adapter.ts`): `extractBookInfo(file)` → `{ title, author, cover }` via `makeBook` + `getCover()`; wraps engine failures in `InvalidBookError` so nothing is written on a bad file. Author normalization: `[].concat(author).filter(Boolean).join(', ')`. Cover failures degrade to null (never fail import).
- **Dexie v2** (`src/lib/db/dexie-db.ts`): `books` table (`id, title, added_at`) storing blob + metadata + progress/location columns (the latter written by ticket 05). Helpers: `addBook`, `getBooks` (newest first), `getBookBlob`, `deleteBook`, `findBookByTitleAuthor` (case/whitespace-insensitive; authorless books match on title).
- **Shelf** (`BooksSpace`): card grid with cover (object URL, revoked on delete/unmount), title, author; hidden `<input type="file" accept=".epub,application/epub+zip">` triggers the system picker on web and in the Capacitor WebView (no plugin needed; `@capacitor/filesystem` is the documented fallback if a device's picker misbehaves); duplicate → confirm-replace; delete → danger confirm; toasts; empty-state CTA.
- Fixture EPUB gained an SVG cover so the `getCover()` path is exercised.
- Tests: adapter 4 (jsdom, incl. non-EPUB + corrupt-zip rejection), book store 6 (fake-indexeddb, mirroring `dexie-db.test.ts`). `npm test` 87/87, `npm run build` green, APK rebuilt.

Known follow-ups (outside this ticket):
- Toast plumbing in BooksSpace duplicates HomePage's ~15 lines — candidate for a shared `useToasts` hook.
- Replace flow deletes the old book before writing the new one; a mid-write failure would lose the old copy (unlikely for a local store, accepted).
- Manual check worth doing on device: picker actually surfaces `.epub` files on your Android file picker; if not, add the `@capacitor/filesystem` fallback.

- [ ] Import button opens the system file picker for `.epub` files on web and the Android APK
- [ ] A valid EPUB appears on the shelf with cover, title, and author from its OPF metadata
- [ ] Invalid/corrupt files show a friendly error and leave no partial record
- [ ] Duplicate import (same title+author) prompts confirm-replace instead of silently duplicating
- [ ] Delete confirms first, then removes the book from the shelf and storage
- [ ] Empty shelf shows an import call-to-action; imported books persist across reloads
