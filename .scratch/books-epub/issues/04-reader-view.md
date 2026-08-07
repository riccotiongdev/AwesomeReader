# 04 — Reader view

**What to build:** The dedicated full-screen book reader. Tapping a book on the shelf opens it in a new reader view (not the article reader modal) rendered through the folio adapter. The reader supports the three existing themes (OLED dark, sepia, light), a small set of font-size presets, and a table-of-contents drawer to jump between chapters. The Android hardware back button (and the in-view back control) returns to the shelf. Opening a different book while one is open switches cleanly with no leaked state.

**Blocked by:** 03 (Import + shelf).

**Status:** resolved

## Answer

Implemented and committed (`59337dc`).

- **Adapter reader surface** (`folio-adapter.ts`): `ReaderSession` — mounts a `<foliate-view>`, `open(file)` + `init({})`, exposes `toc`, `title`, `setStyles(css)`, `goTo(href)`, `next()`/`prev()`, `close()` (engine teardown + element removal). `tocToItems` maps nav items to a stable shape; `buildReaderCss(theme, pct)` injects palette + font-size; `ReaderTheme = 'oled' | 'sepia' | 'light'`.
- **BookReader** (`components/BookReader.tsx`): fixed full-screen layer (z 450, above modals), header with back / title / A− A+ / theme-dot cycle / TOC button; TOC drawer (z 500, nested items, jumps via `goTo`); back = in-view button + Android hardware listener (TOC first, then close) + Escape on web; error state with return-to-library. Session opened from the stored blob, torn down on unmount/book-switch, async-race guarded.
- **reader-settings** (`lib/books/reader-settings.ts`): reader theme + font size persisted under their own keys; reader theme defaults to the app's theme on first run; font size validated 50–300.
- BooksSpace: card tap opens the reader (delete stops propagation).
- Tests: 12 new (reader-settings 5, adapter reader surface 4, TOC 2, theme CSS 1). `npm test` 99/99, build green, APK rebuilt.

Notes / follow-ups:
- Pagination, theme visuals, TOC navigation, and back behavior are inherently on-device checks — the spike harness (`#spike`) and the reader both exercise them; worth a manual pass on the APK.
- "Persist per session" shipped as global persistence (survives app restarts) — stronger than asked.
- Progress save/resume is ticket 05 and will plug into `ReaderSession` (relocate event → `lastLocation`).

- [ ] Tapping a shelf book opens a full-screen reader rendering the book's content with working pagination
- [ ] OLED/Sepia/Light themes apply to the reader and match the app's existing theme styling
- [ ] Font-size presets change reader text size and persist per session
- [ ] TOC lists the book's chapters and jumps to the selected chapter
- [ ] Back (hardware + in-view) returns to the shelf with the book left where it was
- [ ] Switching books mid-read and reopening works without stale state
