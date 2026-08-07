'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Book } from '@/types';
import { clientDb } from '@/lib/db/dexie-db';
import {
  buildReaderCss,
  BookLocation,
  ReaderSession,
  ReaderTheme,
  TocItem,
} from '@/lib/books/folio-adapter';
import {
  FONT_SIZE_PRESETS,
  loadReaderFontSize,
  loadReaderTheme,
  saveReaderFontSize,
  saveReaderTheme,
} from '@/lib/books/reader-settings';

interface BookReaderProps {
  book: Book;
  onClose: () => void;
}

const THEME_ORDER: ReaderTheme[] = ['oled', 'sepia', 'light'];

/** Fraction at/above which the book counts as finished (ticket 05). */
const COMPLETE_THRESHOLD = 0.999;
const SAVE_DEBOUNCE_MS = 600;

/**
 * The dedicated full-screen book reader (ticket 04). Renders the book through
 * the folio adapter's ReaderSession; supports the three themes, font-size
 * presets, and a TOC drawer. Back (in-view + Android hardware) returns to the
 * shelf. Progress save/resume lands in ticket 05.
 */
export const BookReader: React.FC<BookReaderProps> = ({ book, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ReaderSession | null>(null);
  const themeRef = useRef<ReaderTheme>(loadReaderTheme());
  const fontRef = useRef<number>(loadReaderFontSize());
  const tocOpenRef = useRef(false);

  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(themeRef.current);
  const [fontPct, setFontPct] = useState<number>(fontRef.current);
  const [error, setError] = useState<string | null>(null);

  // Progress save/resume (ticket 05): latest position + pending debounce.
  const lastLocationRef = useRef<BookLocation | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushProgress = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const loc = lastLocationRef.current;
    if (!loc || !loc.cfi) return;
    const finished = loc.fraction != null && loc.fraction >= COMPLETE_THRESHOLD;
    await clientDb
      .updateBookProgress(book.id, {
        // A finished book restarts from the top next open (location = null).
        location: finished ? null : loc.cfi,
        progress: finished ? 1 : loc.fraction,
      })
      .catch(() => {});
  }, [book.id]);

  const scheduleProgressSave = useCallback(
    (loc: BookLocation) => {
      lastLocationRef.current = loc;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        flushProgress();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushProgress]
  );

  const applyStyles = useCallback((session: ReaderSession | null) => {
    session?.setStyles(buildReaderCss(themeRef.current, fontRef.current)).catch(() => {});
  }, []);

  // Open the book when the reader mounts or the book changes; tear down on
  // unmount/book-switch so no stale session leaks. Resumes from saved progress.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await clientDb.getBookBlob(book.id);
      if (cancelled) return;
      if (!blob) {
        setError('This book\u2019s file is missing from the library.');
        return;
      }
      const file = new File([blob], `${book.title}.epub`, { type: 'application/epub+zip' });
      try {
        const savedProgress = await clientDb.getBookProgress(book.id);
        if (cancelled) return;
        const saved: BookLocation | null = savedProgress
          ? { cfi: savedProgress.location, fraction: savedProgress.progress }
          : null;
        const session = await ReaderSession.open(containerRef.current!, file, saved);
        if (cancelled) {
          session.close();
          return;
        }
        sessionRef.current = session;
        session.onRelocate = scheduleProgressSave;
        setToc(session.toc);
        applyStyles(session);
      } catch (err) {
        setError(`Could not open this book: ${(err as Error).message || err}`);
      }
    })();
    return () => {
      cancelled = true;
      sessionRef.current?.close();
      sessionRef.current = null;
      // Flush any pending position so leaving the book never loses the page.
      flushProgress();
    };
  }, [book.id, book.title, applyStyles, scheduleProgressSave, flushProgress]);

  // Android hardware back: close the TOC drawer first, then the reader.
  useEffect(() => {
    const handleBack = App.addListener('backButton', () => {
      if (tocOpenRef.current) {
        tocOpenRef.current = false;
        setTocOpen(false);
      } else {
        onClose();
      }
    });
    return () => {
      handleBack.then((h) => h.remove());
    };
  }, [onClose]);

  // Web: Escape closes the reader (TOC drawer first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tocOpenRef.current) {
          tocOpenRef.current = false;
          setTocOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setTocOpenBoth = useCallback((open: boolean) => {
    tocOpenRef.current = open;
    setTocOpen(open);
  }, []);

  const changeTheme = useCallback(
    (next: ReaderTheme) => {
      themeRef.current = next;
      setTheme(next);
      saveReaderTheme(next);
      applyStyles(sessionRef.current);
    },
    [applyStyles]
  );

  const cycleTheme = useCallback(() => {
    const idx = THEME_ORDER.indexOf(themeRef.current);
    changeTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }, [changeTheme]);

  const changeFont = useCallback((delta: number) => {
    const current = fontRef.current;
    const idx = FONT_SIZE_PRESETS.indexOf(current);
    const nextIdx = Math.min(FONT_SIZE_PRESETS.length - 1, Math.max(0, (idx === -1 ? 1 : idx) + delta));
    const next = FONT_SIZE_PRESETS[nextIdx];
    fontRef.current = next;
    setFontPct(next);
    saveReaderFontSize(next);
    applyStyles(sessionRef.current);
  }, [applyStyles]);

  const jumpToToc = useCallback(
    async (href: string) => {
      setTocOpenBoth(false);
      await sessionRef.current?.goTo(href).catch(() => {});
    },
    [setTocOpenBoth]
  );

  const renderTocItems = (items: TocItem[], depth: number): React.ReactNode =>
    items.map((item, i) => (
      <React.Fragment key={`${depth}-${i}-${item.label}`}>
        <button
          className="toc-item"
          style={{ paddingLeft: 14 + depth * 14 }}
          disabled={!item.href}
          onClick={() => item.href && jumpToToc(item.href)}
        >
          {item.label || '(untitled)'}
        </button>
        {item.subitems && renderTocItems(item.subitems, depth + 1)}
      </React.Fragment>
    ));

  return (
    <div className="book-reader" role="dialog" aria-label={`Reading ${book.title}`}>
      <header className="book-reader-header">
        <button className="icon-btn" onClick={onClose} title="Back to library" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="book-reader-title" title={book.title}>
          {book.title}
        </div>
        <div className="book-reader-controls">
          <button className="icon-btn" onClick={() => changeFont(-1)} title="Smaller text" aria-label="Smaller text">
            A−
          </button>
          <button className="icon-btn" onClick={() => changeFont(1)} title="Larger text" aria-label="Larger text">
            A+
          </button>
          <button
            className="icon-btn book-reader-theme-dot"
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            aria-label={`Theme: ${theme}`}
          >
            <span className={`theme-dot theme-dot-${theme}`} />
          </button>
          <button
            className={`icon-btn ${tocOpen ? 'active' : ''}`}
            onClick={() => setTocOpenBoth(!tocOpen)}
            title="Table of contents"
            aria-label="Table of contents"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <div className="book-reader-body">
        {error ? (
          <div className="book-reader-error">
            <span className="empty-icon">⚠️</span>
            <p>{error}</p>
            <button className="add-btn-empty" onClick={onClose}>
              Back to Library
            </button>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="book-reader-viewport" />
            {/* Page-turn controls: the engine only handles touch-swipe/wheel
                natively, so desktop (and discoverability on mobile) needs
                explicit arrows wired to the session. */}
            <button
              className="page-arrow page-arrow-prev"
              onClick={() => sessionRef.current?.goLeft()}
              aria-label="Previous page"
              title="Previous page"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              className="page-arrow page-arrow-next"
              onClick={() => sessionRef.current?.goRight()}
              aria-label="Next page"
              title="Next page"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
        )}
      </div>

      {tocOpen && (
        <div className="toc-overlay">
          <div className="toc-backdrop" onClick={() => setTocOpenBoth(false)} />
          <aside className="toc-drawer" aria-label="Table of contents">
            <div className="toc-header">
              <h3>Contents</h3>
              <button className="close-btn" onClick={() => setTocOpenBoth(false)}>✕</button>
            </div>
            <div className="toc-list">
              {toc.length === 0 ? <p className="toc-empty">No table of contents.</p> : renderTocItems(toc, 0)}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
