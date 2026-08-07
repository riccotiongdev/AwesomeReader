# 04 — Reader view

**What to build:** The dedicated full-screen book reader. Tapping a book on the shelf opens it in a new reader view (not the article reader modal) rendered through the folio adapter. The reader supports the three existing themes (OLED dark, sepia, light), a small set of font-size presets, and a table-of-contents drawer to jump between chapters. The Android hardware back button (and the in-view back control) returns to the shelf. Opening a different book while one is open switches cleanly with no leaked state.

**Blocked by:** 03 (Import + shelf).

**Status:** ready-for-agent

- [ ] Tapping a shelf book opens a full-screen reader rendering the book's content with working pagination
- [ ] OLED/Sepia/Light themes apply to the reader and match the app's existing theme styling
- [ ] Font-size presets change reader text size and persist per session
- [ ] TOC lists the book's chapters and jumps to the selected chapter
- [ ] Back (hardware + in-view) returns to the shelf with the book left where it was
- [ ] Switching books mid-read and reopening works without stale state
