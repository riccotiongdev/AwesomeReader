'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Feed } from '@/types';
import {
  searchInternetFeeds,
  POPULAR_TOPIC_SUGGESTIONS,
  DiscoveredFeed,
} from '@/lib/services/universal-feed-search';
import { decodeHtmlEntities } from '@/lib/utils/html-decoder';

interface ExploreFeedsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribedFeeds: Feed[];
  onSubscribeFeed: (feedUrl: string) => Promise<void>;
  onPreviewFeed: (feedUrl: string, feedTitle?: string) => void;
  onNotify?: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export const ExploreFeedsModal: React.FC<ExploreFeedsModalProps> = ({
  isOpen,
  onClose,
  subscribedFeeds,
  onSubscribeFeed,
  onPreviewFeed,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('technology');
  const [activeCategory, setActiveCategory] = useState<string>('tech');
  const [results, setResults] = useState<DiscoveredFeed[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [subscribingUrl, setSubscribingUrl] = useState<string | null>(null);

  const subscribedUrls = new Set(subscribedFeeds.map((f) => f.feed_url.toLowerCase()));

  const handleSearch = useCallback(async (queryToSearch: string) => {
    if (!queryToSearch.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const feedsFound = await searchInternetFeeds(queryToSearch);
      setResults(feedsFound);
    } catch (err) {
      console.warn('Feed search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search on mount
  useEffect(() => {
    if (isOpen) {
      handleSearch(searchQuery);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCategoryClick = (cat: typeof POPULAR_TOPIC_SUGGESTIONS[0]) => {
    setActiveCategory(cat.id);
    setSearchQuery(cat.query);
    handleSearch(cat.query);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCategory('');
    handleSearch(searchQuery);
  };

  const handleSubscribe = async (feed: DiscoveredFeed) => {
    setSubscribingUrl(feed.feedUrl);
    try {
      await onSubscribeFeed(feed.feedUrl);
    } catch (err: any) {
      if (onNotify) onNotify(`Failed to subscribe to ${feed.title}: ${err.message}`, 'error');
      else console.warn(`Failed to subscribe to ${feed.title}:`, err);
    } finally {
      setSubscribingUrl(null);
    }
  };

  const formatSubscribers = (num?: number) => {
    if (!num || num === 0) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M readers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K readers`;
    return `${num} readers`;
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-content explore-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <h3>🧭 Universal RSS Discovery Engine</h3>
            <span className="subtitle">Search & discover millions of RSS feeds, blogs, and news sources</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Live Search Form */}
        <form className="explore-search-form" onSubmit={handleSearchSubmit}>
          <div className="explore-search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search millions of feeds (e.g. Singapore, AI, Formula 1, Bloomberg, or website URL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search"
                onClick={() => {
                  setSearchQuery('');
                  setResults([]);
                }}
              >
                ×
              </button>
            )}
          </div>
          <button type="submit" className="search-submit-btn" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Popular Topic Filter Chips */}
        <div className="explore-categories-bar">
          {POPULAR_TOPIC_SUGGESTIONS.map((cat) => (
            <button
              key={cat.id}
              className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Search Results Summary */}
        <div className="explore-results-header">
          <span className="results-count">
            {isSearching
              ? 'Searching feed index...'
              : `Found ${results.length} feeds matching "${searchQuery}"`}
          </span>
        </div>

        {/* Directory Feeds Grid */}
        <div className="explore-feeds-grid">
          {isSearching && (
            <div className="explore-loading-state">
              <span className="loading-spinner">⚡</span>
              <p>Searching global RSS index...</p>
            </div>
          )}

          {!isSearching && results.length === 0 && (
            <div className="explore-empty-state">
              <span className="empty-icon">🔍</span>
              <h4>No RSS feeds found</h4>
              <p>Try searching for a different keyword, topic, or paste a website URL directly.</p>
            </div>
          )}

          {!isSearching &&
            results.map((feed) => {
              const isSubscribed = subscribedUrls.has(feed.feedUrl.toLowerCase());
              const isLoading = subscribingUrl === feed.feedUrl;
              const subCountText = formatSubscribers(feed.subscribers);
              const cleanTitle = decodeHtmlEntities(feed.title);

              return (
                <div key={feed.feedUrl} className="directory-feed-card">
                  <div className="card-top">
                    {feed.iconUrl && (
                      <img
                        src={feed.iconUrl}
                        alt=""
                        className="feed-icon-img"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="feed-info">
                      <div className="title-row">
                        <h4 className="feed-title" title={cleanTitle}>{cleanTitle}</h4>
                      </div>
                      <div className="sub-row">
                        <span className="feed-site">{feed.siteUrl.replace(/^https?:\/\//, '')}</span>
                        {subCountText && (
                          <span className="subscriber-badge">🔥 {subCountText}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {feed.description && (
                    <p className="feed-desc">
                      {decodeHtmlEntities(feed.description.replace(/<[^>]*>?/gm, ''))}
                    </p>
                  )}

                  <div className="card-bottom-actions">
                    <button
                      type="button"
                      className="preview-btn"
                      onClick={() => onPreviewFeed(feed.feedUrl, feed.title)}
                      title="Preview 5 latest articles"
                    >
                      👁 Preview
                    </button>

                    <button
                      className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                      onClick={() => !isSubscribed && handleSubscribe(feed)}
                      disabled={isSubscribed || isLoading}
                    >
                      {isLoading
                        ? 'Adding...'
                        : isSubscribed
                        ? '✓ Subscribed'
                        : '+ Subscribe'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Subtle Footer */}
        <div className="modal-footer explore-footer">
          <span className="feedspot-notice">
            Powered by Global RSS Index •{' '}
            <a
              href="https://rss.feedspot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="external-feedspot-link"
            >
              Feedspot Directory ↗
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};
