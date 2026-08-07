# 03 — Import + shelf

**What to build:** The book store and its import path. A user taps Import on the Books shelf, picks an EPUB from device storage (web file input; `@capacitor/filesystem` as fallback if the picker misbehaves on Android), and the book is stored as a blob in Dexie with metadata (title, author, cover) extracted via the folio adapter (ticket 01's engine). The shelf lists imported books with cover, title, and author. Invalid files show a friendly error. Importing a duplicate (same normalized title+author) prompts confirm-replace. A delete affordance on each book confirms and removes the book and its blob. Empty shelf shows an import call-to-action.

**Blocked by:** 01 (Spike: foliate-js in the Capacitor WebView), 02 (Books space shell).

**Status:** ready-for-agent

- [ ] Import button opens the system file picker for `.epub` files on web and the Android APK
- [ ] A valid EPUB appears on the shelf with cover, title, and author from its OPF metadata
- [ ] Invalid/corrupt files show a friendly error and leave no partial record
- [ ] Duplicate import (same title+author) prompts confirm-replace instead of silently duplicating
- [ ] Delete confirms first, then removes the book from the shelf and storage
- [ ] Empty shelf shows an import call-to-action; imported books persist across reloads
