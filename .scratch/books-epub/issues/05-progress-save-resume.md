# 05 — Progress save/resume

**What to build:** The continuous-reading loop's memory. The reader saves the reading position (the engine's location token + a 0–1 progress fraction) automatically on location change (debounced) and when leaving the book; reopening the book restores the exact position. The shelf shows each book's reading progress (e.g. a percentage or progress bar). Resuming works after reloads and app restarts; a book never opened has no progress shown.

**Blocked by:** 04 (Reader view).

**Status:** ready-for-agent

- [ ] Reading position auto-saves while reading and when leaving the book
- [ ] Reopening a book resumes at the saved position, not the start
- [ ] Shelf shows per-book reading progress; never-opened books show none
- [ ] Progress survives reloads and app restarts
- [ ] Reading to the end marks the book complete and resume starts from the top of the next open
