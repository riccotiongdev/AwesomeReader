'use client';

import React from 'react';
import { Space } from '@/lib/space/space-mode';

interface BottomTabBarProps {
  space: Space;
  onSpaceChange: (space: Space) => void;
}

/**
 * Mobile-only bottom tab bar (ADR-0003): one tap to switch between the News
 * and Books spaces. Hidden on desktop (`.bottom-tab-bar`), where the
 * SpaceSwitcher pill lives in the header instead.
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ space, onSpaceChange }) => {
  return (
    <nav className="bottom-tab-bar" aria-label="Reading space">
      <button
        className={`bottom-tab ${space === 'news' ? 'active' : ''}`}
        onClick={() => onSpaceChange('news')}
      >
        <span className="bottom-tab-icon">📰</span>
        <span className="bottom-tab-label">News</span>
      </button>
      <button
        className={`bottom-tab ${space === 'books' ? 'active' : ''}`}
        onClick={() => onSpaceChange('books')}
      >
        <span className="bottom-tab-icon">📚</span>
        <span className="bottom-tab-label">Books</span>
      </button>
    </nav>
  );
};
