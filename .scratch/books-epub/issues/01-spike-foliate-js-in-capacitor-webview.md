# 01 — Spike: foliate-js in the Capacitor WebView

**What to build:** A throwaway spike that answers the go/no-go for the rendering engine (ADR-0002). Install foliate-js, open a small fixture EPUB inside the app as it runs in both the dev browser and the built Android APK, and verify three things: (a) a book renders with pagination working, (b) the existing OLED/Sepia/Light theme CSS can be injected into the book view, and (c) an EPUB blob stored in the app's IndexedDB (Dexie) survives a reload and can be re-opened on the Android WebView. Record the findings as an `## Answer` note in this ticket; if the spike fails on the Android side, capture what broke so the custom-pipeline fallback (also isolated behind the adapter) can be scoped instead.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

**Verdict: GO — foliate-js is viable in the Capacitor WebView** (provisional on the on-device rendering check below).

Automated evidence (all green):

- foliate-js 1.0.1 installs and **bundles cleanly through Vite** — `npm run build` succeeds; the bundle contains the `foliate-view` custom element, the lazy `paginator`/`epub`/`fflate` chunks, and the served fixture (`/mini-book.epub`).
- `makeBook(blob)` **parses the fixture EPUB** in a jsdom test env: title/author/language from the OPF, 3-chapter nav TOC, 3 spine sections. This exercises the exact parse path `view.open()` uses (vendored zip.js with `useWebWorkers: false` + DOMParser) — no fetch, no workers.
- An EPUB blob **round-trips through Dexie/IndexedDB and re-parses** (native Blob via `structuredClone`; fake-indexeddb cannot clone jsdom `File`s — a test-env artifact, see test file notes).
- API surface confirmed for the reader: `view.open(File)`, `view.init({ lastLocation })`, `relocate` event carries `{ cfi, range, ...progress }`, `view.goTo(cfi/path)`, `view.goToFraction(frac)`, `view.renderer.setStyles(css)` for themes, `book.getCover()` → cover Blob.

Metadata shapes to normalize in the adapter (ticket 03): `metadata.author` is a **plain string for one author, an array of name strings for several** (tidy() collapses `{name}` and unwraps length-1 arrays); `metadata.language` likewise string-or-array. Normalize with `[].concat(x).filter(Boolean).join(', ')`.

Dev-only spike harness shipped at `#spike` (remove when ticket 04 lands): renders the fixture via `<foliate-view>`, with next/prev, goTo-chapter, theme (OLED/sepia/light via `setStyles`), font-size, save-location/restore buttons and a relocate-event log.

**Remaining manual verification (on device — needed to close the ticket fully):**

1. `npm run dev`, open `http://localhost:3000/#spike` → book renders paginated; try themes, font ±, next/prev, save/restore location.
2. Install the built `AwesomeReader.apk`, open it, append `#spike` to the URL if needed → same checks in the WebView.
3. In the APK: reload the app (or reopen) after saving a location → confirm it persists (exercises blob-in-IndexedDB on Android).
4. Report results; if rendering fails on Android, the custom-pipeline fallback (isolated behind the same adapter) gets scoped instead.

- [ ] foliate-js installed and a fixture EPUB renders with pagination in the dev browser
- [ ] Same EPUB renders in the built Android APK (webview), themes injectable
- [ ] EPUB blob persists in IndexedDB on Android across a reload and re-opens
- [ ] Go/no-go verdict recorded in this ticket with evidence
