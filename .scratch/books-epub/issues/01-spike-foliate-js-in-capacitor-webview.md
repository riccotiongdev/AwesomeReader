# 01 — Spike: foliate-js in the Capacitor WebView

**What to build:** A throwaway spike that answers the go/no-go for the rendering engine (ADR-0002). Install foliate-js, open a small fixture EPUB inside the app as it runs in both the dev browser and the built Android APK, and verify three things: (a) a book renders with pagination working, (b) the existing OLED/Sepia/Light theme CSS can be injected into the book view, and (c) an EPUB blob stored in the app's IndexedDB (Dexie) survives a reload and can be re-opened on the Android WebView. Record the findings as an `## Answer` note in this ticket; if the spike fails on the Android side, capture what broke so the custom-pipeline fallback (also isolated behind the adapter) can be scoped instead.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] foliate-js installed and a fixture EPUB renders with pagination in the dev browser
- [ ] Same EPUB renders in the built Android APK (webview), themes injectable
- [ ] EPUB blob persists in IndexedDB on Android across a reload and re-opens
- [ ] Go/no-go verdict recorded in this ticket with evidence
