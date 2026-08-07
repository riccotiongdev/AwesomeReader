# 06 — Stretch: Android "Open with" intent

**What to build:** (Stretch — only after the core pipeline works.) An Android intent filter for EPUB files plus the bridge to the app's import path: tapping "Open with AwesomeReader" on an EPUB in Files, Dropbox, or an email attachment imports the book into the store and lands the user on the shelf with the new book visible. If the book is already imported, it opens (or confirms-replace) without duplicating. Requires native Android changes (intent-filter in the manifest) and a Capacitor bridge to receive the file URI/content and read it into the blob store.

**Blocked by:** 03 (Import + shelf).

**Status:** ready-for-agent

- [ ] Android manifest declares AwesomeReader as a handler for EPUB files (intent filter)
- [ ] "Open with AwesomeReader" on an EPUB imports the book into the store and shows it on the shelf
- [ ] Re-importing via share for an existing book does not duplicate it
- [ ] Works from Files, a downloads folder, and an email attachment
- [ ] App remains functional when launched normally (no intent)
