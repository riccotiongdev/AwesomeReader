# 📖 AwesomeReader

**AwesomeReader** is an offline-first, reader-centric reading app with two top-level spaces: a **News** RSS reader and a **Books** EPUB reader. Built with Vite, React, TypeScript, Dexie.js (IndexedDB), and Capacitor v6, it runs on Web, PWA, and Mobile (Android APK / iOS), with a distraction-free reading experience inspired by Apple Books and iOS Human Interface Guidelines.

---

## ✨ Features

### 🗞️ News (RSS Reader)

- **Reader-Centric Typography & Themes**: OLED Dark (deep black for OLED screens), Sepia Paper, and Light modes.
- **Universal RSS Discovery Engine**: live search across millions of RSS feeds, blogs, news outlets, and podcasts; topic category chips for instant exploration.
- **5-Article Live Feed Preview**: preview the latest articles of any feed before subscribing; subscribe with one tap.
- **Paywall Bypass & Full-Text Extraction**: built-in Web Archive Today (`archive.ph`) button for paywalled articles; intelligent JSON-LD + Readability parsing extracts full article bodies (in a web worker).
- **Folders & Drag-and-Drop Organization**: collapsible folders, drag-and-drop feeds, 3-dot management popovers.
- **OPML Import & Export**: standard `.opml` format.
- **Mark-as-Read & Starring**: unread/all/starred views, mark-all-read, pull-to-refresh, Android hardware-back navigation.

### 📚 Books (EPUB Reader)

- **Top-Level News | Books Spaces**: persistent switcher (segmented control in the header on desktop, bottom tab bar on mobile); the app opens in your last-used space.
- **EPUB Import**: import `.epub` files from device storage via the system file picker (web + Capacitor WebView). Metadata (title, author, cover) is read from the book's OPF; duplicates are detected and prompt a replace; invalid files show a friendly error with no partial record.
- **Shelf**: grid of book covers with title, author, and a per-book reading-progress bar ("Finished" once completed). Delete with confirmation.
- **Full-Screen Reader**: paginated rendering powered by **foliate-js** (the engine behind Foliate/Readest), reached only through a thin adapter seam. OLED/Sepia/Light reader themes, A−/A+ font-size presets, and a table-of-contents drawer with nested chapters.
- **Progress Save & Resume**: your position auto-saves as you read (debounced, flushed when you leave) and resumes exactly where you left off — including after app restarts. Finishing a book marks it complete and the next open starts from the top.
- **Navigation**: tap the on-page ‹ › arrows, swipe (touch), or scroll (wheel). Android hardware back returns from the reader to the shelf.

---

## 🛠️ Technology Stack

- **Framework**: Vite + React 18 + TypeScript (strict)
- **Styling**: Vanilla CSS with CSS Custom Properties (three themes via `data-theme`)
- **Local Database**: Dexie.js (IndexedDB) — `folders`, `feeds`, `articles`, and `books` (EPUB blobs + metadata + progress)
- **EPUB Engine**: `foliate-js` behind a **folio adapter** (`src/lib/books/folio-adapter.ts`) — the single seam where all engine interaction lives, keeping it swappable and unit-testable
- **RSS Parsing**: `fast-xml-parser` with entity protection; Readability + sanitize-html for article extraction
- **Native Platform**: Capacitor v6 (Android / iOS); worker-based extraction
- **Tests**: Vitest (node default; jsdom per-file where DOM parsing is needed) with `fake-indexeddb`

---

## 🏗️ Architecture

```
AppShell (News|Books space, persisted)
 ├── News space — HomePage: feeds/folders → article list → ArticleReaderModal
 │                (existing RSS experience, untouched by Books)
 ├── Books space — BooksSpace: shelf (import / list / delete / progress)
 │                └── BookReader: full-screen reader → ReaderSession (folio adapter) → foliate-js
 └── BottomTabBar (mobile) / SpaceSwitcher (desktop header)
```

Both spaces stay mounted (the inactive one is CSS-hidden), so each space's state — open article, scroll position, open book — survives switching.

Key decisions are recorded as ADRs in [`docs/adr/`](docs/adr/) (EPUB-only MVP scope, foliate-js behind an adapter, two-space shell). The Books feature's spec and tickets live in `.scratch/books-epub/`.

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20.x` or higher
- npm `v10.x` or higher
- Android Studio / JDK 17+ (for building native Android APKs)

### Installation & Development

```bash
npm install
npm run dev        # Vite dev server on http://localhost:3000
```

### Tests

```bash
npm test           # full Vitest suite
npm run test:watch
```

### Building

```bash
npm run build      # typecheck + web bundle + cap sync + Android APK (JDK 17)
npm run build:web  # web-only build
```

`npm run build` produces the production web bundle in `dist/` and copies a fresh `AwesomeReader.apk` to the project root.

---

## 📱 Building the Native Android App

```bash
npm run build      # full build incl. APK
```

The compiled APK lands at `AwesomeReader.apk` (also at `android/app/build/outputs/apk/debug/app-debug.apk`).

---

## 🗺️ Roadmap

**Done (Books MVP, tickets 01–05):** foliate-js spike → two-space shell → import + shelf → reader (themes/font/TOC) → progress save/resume.

**Stretch:** Android "Open with" intent (share EPUBs into the app from Files/Dropbox/email) — ticket 06.

**Future formats/features:** PDF, MOBI/AZW3, FB2, CBZ, TXT/MD; highlights & annotations; in-book search; cross-device sync. Each bolts onto the folio adapter seam without reworking the shell.

---

## 📄 License

MIT License.
