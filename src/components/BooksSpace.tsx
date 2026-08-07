'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Space } from '@/lib/space/space-mode';
import { SpaceSwitcher } from '@/components/SpaceSwitcher';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ToastContainer, ToastItem } from '@/components/ToastContainer';
import { BookReader } from '@/components/BookReader';
import { Book } from '@/types';
import { clientDb } from '@/lib/db/dexie-db';
import { extractBookInfo, InvalidBookError, BookInfo } from '@/lib/books/folio-adapter';

interface BooksSpaceProps {
  space: Space;
  onSpaceChange: (space: Space) => void;
}

/**
 * The Books space (ADR-0003): the shelf. Import (ticket 03) is the file
 * picker → adapter metadata extraction → Dexie blob store pipeline; reading
 * (tickets 04/05) plugs into the same shelf.
 */
export const BooksSpace: React.FC<BooksSpaceProps> = ({ space, onSpaceChange }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null);
  const [pendingReplace, setPendingReplace] = useState<{ file: File; info: BookInfo } | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverUrlsRef = useRef<Map<string, string>>(new Map());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const loadBooks = useCallback(async () => {
    setBooks(await clientDb.getBooks());
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    const urls = coverUrlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const coverUrlFor = useCallback((book: Book): string | null => {
    if (!book.cover) return null;
    const existing = coverUrlsRef.current.get(book.id);
    if (existing) return existing;
    const url = URL.createObjectURL(book.cover);
    coverUrlsRef.current.set(book.id, url);
    return url;
  }, []);

  const revokeCoverUrl = useCallback((bookId: string) => {
    const url = coverUrlsRef.current.get(bookId);
    if (url) {
      URL.revokeObjectURL(url);
      coverUrlsRef.current.delete(bookId);
    }
  }, []);

  const persistBook = useCallback(
    async (file: File, info: BookInfo, replaceExisting?: Book) => {
      if (replaceExisting) {
        await clientDb.deleteBook(replaceExisting.id);
        revokeCoverUrl(replaceExisting.id);
      }
      await clientDb.addBook({
        blob: file,
        title: info.title,
        author: info.author,
        cover: info.cover,
      });
      showToast(replaceExisting ? `Replaced "${info.title}"` : `Imported "${info.title}"`, 'success');
      await loadBooks();
    },
    [loadBooks, revokeCoverUrl, showToast]
  );

  const handleFileSelected = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setIsImporting(true);
      try {
        const info = await extractBookInfo(file);
        const existing = await clientDb.findBookByTitleAuthor(info.title, info.author);
        if (existing) {
          setPendingReplace({ file, info });
          return;
        }
        await persistBook(file, info);
      } catch (err) {
        showToast(
          err instanceof InvalidBookError
            ? err.message
            : `Import failed: ${(err as Error).message || err}`,
          'error'
        );
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [persistBook, showToast]
  );

  const handleDelete = useCallback(
    async (book: Book) => {
      await clientDb.deleteBook(book.id);
      revokeCoverUrl(book.id);
      setConfirmDelete(null);
      showToast(`Deleted "${book.title}"`, 'success');
      await loadBooks();
    },
    [loadBooks, revokeCoverUrl, showToast]
  );

  const closeReader = useCallback(() => setReadingBook(null), []);

  return (
    <div className="books-layout">
      <header className="header books-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">Books</span>
          </div>
        </div>
        <div className="header-center">
          <SpaceSwitcher space={space} onSpaceChange={onSpaceChange} />
        </div>
        <div className="header-right">
          <button
            className="books-import-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? 'Importing…' : '+ Import EPUB'}
          </button>
        </div>
      </header>

      <main className="books-body">
        {books.length === 0 ? (
          <div className="books-empty">
            <span className="empty-icon">📚</span>
            <h2>Your library is empty</h2>
            <p>Import an EPUB from this device to start reading with AwesomeReader's themes.</p>
            <button className="add-btn-empty" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              + Import Your First Book
            </button>
          </div>
        ) : (
          <div className="books-shelf">
            {books.map((book) => {
              const coverUrl = coverUrlFor(book);
              return (
                <div className="book-card" key={book.id}>
                  <button
                    className="book-delete-btn"
                    title={`Delete ${book.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(book);
                    }}
                  >
                    ✕
                  </button>
                  <button className="book-card-main" onClick={() => setReadingBook(book)}>
                    <div className="book-cover">
                      {coverUrl ? (
                        <img src={coverUrl} alt={`${book.title} cover`} loading="lazy" />
                      ) : (
                        <span className="book-cover-placeholder">📖</span>
                      )}
                    </div>
                    <div className="book-title" title={book.title}>
                      {book.title}
                    </div>
                    <div className="book-author">{book.author ?? 'Unknown author'}</div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Hidden file input drives the system picker (web + Capacitor WebView) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete this book?"
        message={`"${confirmDelete?.title}" will be removed from your library and this device.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={!!pendingReplace}
        title="Book already in your library"
        message={`"${pendingReplace?.info.title}" is already imported. Replace the existing copy?`}
        confirmLabel="Replace"
        onConfirm={async () => {
          const pending = pendingReplace;
          setPendingReplace(null);
          if (!pending) return;
          const existing = await clientDb.findBookByTitleAuthor(pending.info.title, pending.info.author);
          await persistBook(pending.file, pending.info, existing ?? undefined);
        }}
        onCancel={() => setPendingReplace(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {readingBook && <BookReader book={readingBook} onClose={closeReader} />}
    </div>
  );
};
