# AwesomeReader — Books (EPUB) MVP

**Status:** ready-for-agent
**Feature:** books-epub
**Date:** 2026-02-18

## Problem Statement

AwesomeReader today reads only RSS articles. Users who want to read ebooks have no way to bring their own EPUB files into the app, see them on a shelf, or read them with the same comfortable, themeable, offline-first experience the news reader provides. The app needs a second, top-level reading space for books.

## Solution

AwesomeReader gains a **Books space** beside the existing News space, reachable through a persistent top-level switcher (bottom tab on mobile, segmented control on desktop) that defaults to the last-used mode. Inside Books, users import EPUB files from their device, see them on a shelf with cover, title, author, and reading progress, and open any book in a dedicated full-screen reader that supports the existing OLED/Sepia/Light themes, font-size control, chapter navigation, and automatic progress saving that resumes where they left off. Rendering is powered by foliate-js behind a thin adapter seam (ADR-0002); EPUBs are stored as blobs in the existing IndexedDB store (ADR-0001).

## User Stories

1. As a user, I want a top-level choice between News and Books, so that I can decide what kind of reading I'm doing today.
2. As a user, I want the app to open in my last-used mode, so that I don't re-choose every launch.
3. As a user, I want to switch modes with one tap from anywhere, so that I can move between news and books without friction.
4. As a user, I want to import an EPUB file from my device's storage, so that I can read books I already own.
5. As a user, I want the shelf to show each book's cover, title, and author, so that I can find the book I want.
6. As a user, I want the shelf to show how far I've read in each book, so that I can pick up where I left off.
7. As a user, I want an empty shelf to show a clear "import your first book" call-to-action, so that I know how to get started.
8. As a user, I want a friendly error when a file is not a valid EPUB, so that I understand why the import failed.
9. As a user, I want duplicate imports detected, so that I don't end up with copies of the same book.
10. As a user, I want to open a book and read it full-screen, so that I can read without distraction.
11. As a user, I want the OLED dark, sepia, and light themes in the reader, so that reading is comfortable in any light.
12. As a user, I want to adjust the reader font size, so that I can read comfortably.
13. As a user, I want a table of contents, so that I can jump to a specific chapter.
14. As a user, I want my reading position saved automatically, so that reopening the book resumes where I left off.
15. As a user, I want the hardware/back button in the reader to return to the shelf, so that I can switch books naturally.
16. As a user, I want to delete a book from the shelf, so that I can curate my library.
17. (Stretch) As an Android user, I want to choose "Open with AwesomeReader" on an EPUB from another app, so that I can import without opening the app first.

## Implementation Decisions

- **Two-space shell (ADR-0003):** a persistent News|Books switcher; the last-used mode is persisted in a small key-value store (localStorage) and used as the launch default. Books space hosts the shelf; the reader is a dedicated full-screen view with its own back handling — never the article reader modal.
- **Storage (ADR-0001):** a new Dexie table for books storing the EPUB blob (IndexedDB supports blobs; verified on the Android WebView during the spike), metadata (title, author, cover), added-at, and reading progress (the engine's location token plus a 0–1 progress fraction). Existing tables untouched; database version bumped.
- **Folio adapter (ADR-0002):** all foliate-js interaction lives behind an adapter exposing `openBook(blob)` → metadata, TOC, goTo, theme, font-size, and location save/restore. UI depends only on this interface.
- **Import (MVP):** a web file input (`<input type="file" accept=".epub">`), which opens the system picker both in browsers and in the Capacitor WebView. `@capacitor/filesystem` picker is the fallback if the input proves unreliable on Android. The stretch ticket adds the Android share/open intent.
- **Metadata:** extracted from the EPUB's OPF via the adapter (title, author, cover). Fast and free; no separate metadata path.
- **Duplicates:** normalize title+author; on duplicate, confirm-replace before overwriting.
- **Progress:** save the foliate-js location token and progress fraction on location change (debounced) and on back/unmount; on open, restore via goTo. No cross-device sync in MVP.
- **Themes & typography:** reader themes reuse the existing OLED/Sepia/Light CSS custom properties; font size is a small set of presets.
- **Delete:** reuse the existing confirm-dialog component before removing a book and its blob.

## Testing Decisions

- **What makes a good test:** external behavior only — what the user can observe (a book imports, lists, resumes) — not internal implementation of the engine or the view.
- **Book store seam:** new Dexie table and its helper methods tested with `fake-indexeddb`, mirroring the existing `dexie-db.test.ts` prior art: add a book, list with progress, fetch a blob, update progress, delete.
- **Folio adapter seam:** one checked-in tiny fixture EPUB proves the real adapter end-to-end (open → metadata → render → location round-trip); all other tests mock the adapter interface.
- **Mode state:** last-used mode persistence tested as pure logic.
- **Shell/UI:** no component-test infrastructure is added in this MVP; view wiring is verified manually per ticket acceptance criteria and by the full `npm run build` (web bundle + APK) per AGENTS.md conventions.

## Out of Scope

- PDF, MOBI, AZW3 (KF8), FB2, CBZ, TXT, MD formats
- Highlights, annotations, and notes
- In-book search, dictionary, translation, TTS
- Cross-device sync, cloud libraries, OPDS/Calibre integration
- Import from URL
- iOS-specific hardening (web + Android are the targets; the code should not break iOS)
- Component-test infrastructure

## Further Notes

- The **spike ticket** (foliate-js in the Capacitor WebView + blob persistence on Android) is the first engine-dependent ticket and gates the reader work; the adapter keeps the custom-pipeline fallback cheap if the spike fails.
- A tiny public-domain EPUB fixture is checked into the repo's test fixtures for the adapter test.
- Progress is stored locally per device; a future sync feature would move this behind the same storage seam.
