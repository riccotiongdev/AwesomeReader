# ADR-0002: foliate-js behind an adapter seam

**Status:** Accepted  
**Date:** 2026-02-18 (session)

## Context

The Books reader needs an EPUB rendering engine. Options: `foliate-js` (actively maintained, powers Foliate/Readest — the reference product, first-class EPUB3, built-in TOC/pagination/theming/highlight APIs), `epub.js` (battle-tested but in maintenance mode, clunky EPUB3 and annotation support), or a custom unzip-and-render pipeline (maximum control, weeks of work rebuilding pagination/TOC/layout).

## Decision

Use **foliate-js**, reached only through a thin **folio adapter** module that owns all engine interaction and exposes a small interface the UI depends on: `openBook(blob)` → metadata, TOC, navigation (goTo), theme, font-size, and location save/restore. UI code never imports foliate-js directly.

A **spike ticket** verifies foliate-js renders correctly inside the Capacitor Android WebView (and that EPUB blobs persist in IndexedDB on Android) before the full build. If the spike fails, the fallback is the custom pipeline, isolated by the same adapter — the rest of the app is unaffected.

## Consequences

- Engine is swappable; the adapter is the test seam (mocked in unit tests, one fixture EPUB for the real adapter).
- Highlight/search APIs exist in foliate-js, so phase 2 features are designed-in, not retrofitted.
- Risk is retired early by the spike, before engine-dependent tickets start.
