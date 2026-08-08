'use client';

import React, { useState } from 'react';
import { Space } from '@/lib/space/space-mode';

interface SpaceModeButtonProps {
  space: Space;
  onSpaceChange: (space: Space) => void;
}

const MODES: { value: Space; icon: string; label: string; description: string }[] = [
  { value: 'news', icon: '📰', label: 'News', description: 'Feeds, folders, and articles' },
  { value: 'books', icon: '📚', label: 'Books', description: 'Your EPUB library and reader' },
];

/**
 * Mobile-only current-mode button (ADR-0003): the header shows only the
 * active reading space ("📰 News" / "📚 Books") and taps open a modal picker
 * to switch. Desktop keeps the segmented pill (`.space-switcher`); this
 * button is hidden there via `.mobile-only`.
 */
export const SpaceModeButton: React.FC<SpaceModeButtonProps> = ({ space, onSpaceChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = MODES.find((m) => m.value === space) ?? MODES[0];

  return (
    <>
      <button
        className="space-mode-btn mobile-only"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={`Switch reading mode (currently ${current.label})`}
      >
        <span className="space-mode-icon">{current.icon}</span>
        <span className="space-mode-label">{current.label}</span>
        <svg
          className="space-mode-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content space-mode-modal animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Reading Mode</h3>
              <button className="close-btn" onClick={() => setIsOpen(false)} title="Close">
                ✕
              </button>
            </div>
            <div className="space-mode-options">
              {MODES.map((mode) => {
                const isActive = mode.value === space;
                return (
                  <button
                    key={mode.value}
                    className={`space-mode-option ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSpaceChange(mode.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="space-mode-option-icon">{mode.icon}</span>
                    <span className="space-mode-option-text">
                      <span className="space-mode-option-label">{mode.label}</span>
                      <span className="space-mode-option-desc">{mode.description}</span>
                    </span>
                    {isActive && (
                      <svg
                        className="space-mode-option-check"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
