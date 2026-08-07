'use client';

import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'oled' | 'sepia' | 'light';
  setTheme: (theme: 'oled' | 'sepia' | 'light') => void;
  onOpenOpml: () => void;
  onClearCachedArticles: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  setTheme,
  onOpenOpml,
  onClearCachedArticles,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Settings</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Appearance */}
        <div className="opml-section">
          <h4>🎨 Appearance</h4>
          <p className="desc">Choose the color theme for the whole app.</p>
          <div className="theme-toggle-group">
            <button
              className={`theme-chip ${theme === 'oled' ? 'active' : ''}`}
              onClick={() => setTheme('oled')}
              title="OLED Dark Theme"
            >
              🌙 OLED
            </button>
            <button
              className={`theme-chip ${theme === 'sepia' ? 'active' : ''}`}
              onClick={() => setTheme('sepia')}
              title="Sepia Paper Theme"
            >
              📜 Sepia
            </button>
            <button
              className={`theme-chip ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Light Theme"
            >
              ☀️ Light
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* Subscriptions */}
        <div className="opml-section">
          <h4>📚 Subscriptions</h4>
          <p className="desc">Back up or restore your feeds and folders with an OPML file.</p>
          <button type="button" className="btn-secondary" onClick={onOpenOpml}>
            📥 Import / 📤 Export OPML
          </button>
        </div>

        <div className="divider" />

        {/* Data */}
        <div className="opml-section">
          <h4>🗑 Data</h4>
          <p className="desc">
            Delete cached articles from this device. Your folders, subscriptions, and starred
            articles are kept — new articles will appear after the next refresh. Read state resets.
          </p>
          <button type="button" className="btn-danger" onClick={onClearCachedArticles}>
            🗑 Clear Cached Articles
          </button>
        </div>
      </div>
    </div>
  );
};
