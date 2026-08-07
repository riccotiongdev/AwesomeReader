# 05 — Progress save/resume

**What to build:** The continuous-reading loop's memory. The reader saves the reading position (the engine's location token + a 0–1 progress fraction) automatically on location change (debounced) and when leaving the book; reopening the book restores the exact position. The shelf shows each book's reading progress (e.g. a percentage or progress bar). Resuming works after reloads and app restarts; a book never opened has no progress shown.

**Blocked by:** 04 (Reader view).

**Status:** resolved

## Answer

Implemented and committed (`2d17a42`).

- **Adapter** (`folio-adapter.ts`): `BookLocation { cfi, fraction }`; `locationToSerializable(detail)` strips the relocate detail (a DOM Range and section/time bookkeeping are non-serializable); `resolveInitialLocation(saved)` → exact CFI, else `{ fraction }`, else start. `ReaderSession.open(container, file, saved)` passes it to `init({ lastLocation })`; the session exposes `currentLocation` and an `onRelocate` hook.
- **Store** (`dexie-db.ts`): `updateBookProgress` (partial updates don't clobber the other field) + `getBookProgress`.
- **BookReader**: resumes from the saved position; saves 600 ms after any relocate (page turn or TOC jump); flushes on leave (back/unmount/book-switch) so the last page is never lost; finishes the book when `fraction >= 0.999` — writes `progress: 1` and clears the location so the next open starts at the top.
- **BooksSpace**: reloads the shelf when the reader closes; cards show a progress bar + percentage (green "Finished" at 100%); never-opened books show no indicator.
- Tests: 7 new (store 4, adapter 3). `npm test` 106/106, build green, APK rebuilt.

Notes:
- DB names the position `location`/`progress`, the adapter uses engine terms `cfi`/`fraction`, bridged by one mapping in BookReader — candidate to unify via domain-modeling.
- Resume precision (CFI) and finish detection are engine behaviors verified on device; the deterministic parts (extraction, target selection, persistence) are unit-tested.
- This closes the core MVP loop: import → shelf → read → themes/font/TOC → progress resume.

- [ ] Reading position auto-saves while reading and when leaving the book
- [ ] Reopening a book resumes at the saved position, not the start
- [ ] Shelf shows per-book reading progress; never-opened books show none
- [ ] Progress survives reloads and app restarts
- [ ] Reading to the end marks the book complete and resume starts from the top of the next open
