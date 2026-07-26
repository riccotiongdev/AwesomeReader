'use client';

import React from 'react';

interface HeaderProps {
  activeTab: 'all' | 'unread' | 'starred';
  setActiveTab: (tab: 'all' | 'unread' | 'starred') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onToggleSidebar,
  isRefreshing,
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <button className="icon-btn mobile-only" onClick={onToggleSidebar} title="Folders Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="logo">
          <span className="logo-icon">📖</span>
          <span className="logo-text">AwesomeReader</span>
        </div>
      </div>

      <div className="header-center">
        <div className="filter-tabs">
          <button
            className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Unread
          </button>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`tab-btn ${activeTab === 'starred' ? 'active' : ''}`}
            onClick={() => setActiveTab('starred')}
          >
            Starred ★
          </button>
        </div>

        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>
      </div>

      <div className="header-right">
        <button
          className={`icon-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={onRefresh}
          title="Refresh feeds"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>
    </header>
  );
};
