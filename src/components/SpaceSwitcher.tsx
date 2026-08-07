'use client';

import React from 'react';
import { Space } from '@/lib/space/space-mode';

interface SpaceSwitcherProps {
  space: Space;
  onSpaceChange: (space: Space) => void;
}

/**
 * Segmented News|Books pill (ADR-0003). Desktop placement: inside each
 * space's header. Mobile uses the bottom tab bar instead (`.space-switcher`
 * is hidden under the 520px breakpoint).
 */
export const SpaceSwitcher: React.FC<SpaceSwitcherProps> = ({ space, onSpaceChange }) => {
  return (
    <div className="space-switcher" role="tablist" aria-label="Reading space">
      <button
        role="tab"
        aria-selected={space === 'news'}
        className={`space-switch-btn ${space === 'news' ? 'active' : ''}`}
        onClick={() => onSpaceChange('news')}
      >
        📰 News
      </button>
      <button
        role="tab"
        aria-selected={space === 'books'}
        className={`space-switch-btn ${space === 'books' ? 'active' : ''}`}
        onClick={() => onSpaceChange('books')}
      >
        📚 Books
      </button>
    </div>
  );
};
