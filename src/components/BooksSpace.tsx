'use client';

import React from 'react';
import { Space } from '@/lib/space/space-mode';
import { SpaceSwitcher } from '@/components/SpaceSwitcher';

interface BooksSpaceProps {
  space: Space;
  onSpaceChange: (space: Space) => void;
}

/**
 * The Books space (ADR-0003). Ticket 02 ships the shell only: a header with
 * the desktop space switcher and a placeholder shelf. The real shelf and
 * import flow land in ticket 03; the reader in 04/05.
 */
export const BooksSpace: React.FC<BooksSpaceProps> = ({ space, onSpaceChange }) => {
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
      </header>

      <main className="books-body">
        <div className="books-empty">
          <span className="empty-icon">📚</span>
          <h2>Your library is empty</h2>
          <p>
            EPUB import is coming next — soon you'll be able to add books from
            this device and read them with AwesomeReader's themes.
          </p>
        </div>
      </main>
    </div>
  );
};
