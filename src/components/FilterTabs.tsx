'use client';

import React from 'react';

export type ArticleFilterTab = 'all' | 'unread' | 'starred';

interface FilterTabsProps {
  activeTab: ArticleFilterTab;
  setActiveTab: (tab: ArticleFilterTab) => void;
}

/**
 * Unread | All | Starred segmented pill (the "filter tabs").
 *
 * Lives in the timeline header next to the feed title at every width, so
 * the top header stays lean (space switcher + search on desktop, mode chip
 * on mobile). The timeline header itself is sticky below the app header,
 * so the pill stays reachable while the list scrolls.
 */
export const FilterTabs: React.FC<FilterTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="filter-tabs">
      <button
        type="button"
        className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
        onClick={() => setActiveTab('unread')}
      >
        Unread
      </button>
      <button
        type="button"
        className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        onClick={() => setActiveTab('all')}
      >
        All
      </button>
      <button
        type="button"
        className={`tab-btn ${activeTab === 'starred' ? 'active' : ''}`}
        onClick={() => setActiveTab('starred')}
        title="Starred"
        aria-label="Starred"
      >
        ★
      </button>
    </div>
  );
};
