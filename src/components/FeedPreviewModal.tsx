'use client';

import React, { useState, useEffect } from 'react';
import { fetchAndParseFeed } from '@/lib/services/feed-crawler';
import { decodeHtmlEntities } from '@/lib/utils/html-decoder';
import { Article } from '@/types';

interface FeedPreviewModalProps {
  isOpen: boolean;
  feedUrl: string | null;
  feedTitle?: string;
  onClose: () => void;
  onSubscribe: (feedUrl: string) => Promise<void>;
  isSubscribed: boolean;
}

export const FeedPreviewModal: React.FC<FeedPreviewModalProps> = ({
  isOpen,
  feedUrl,
  feedTitle,
  onClose,
  onSubscribe,
  isSubscribed,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedFeed, setParsedFeed] = useState<{ title: string; siteUrl?: string; description?: string } | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !feedUrl) {
      setArticles([]);
      setParsedFeed(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchAndParseFeed(feedUrl)
      .then((res) => {
        if (!isMounted) return;
        if (res.result) {
          setParsedFeed({
            title: res.result.feedTitle || feedTitle || 'RSS Feed',
            siteUrl: res.result.siteUrl || undefined,
          });
          setArticles(res.result.articles.slice(0, 5));
        } else {
          setError('No content available for this feed');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load RSS preview');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, feedUrl, feedTitle]);

  if (!isOpen || !feedUrl) return null;

  const handleSubscribeClick = async () => {
    setIsSubscribing(true);
    try {
      await onSubscribe(feedUrl);
      onClose();
    } catch (err: any) {
      alert(`Failed to subscribe: ${err.message}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose} style={{ zIndex: 400 }}>
      <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <h3>👁 Feed Preview (Latest 5 Articles)</h3>
            <span className="subtitle">
              {parsedFeed ? decodeHtmlEntities(parsedFeed.title) : feedTitle || feedUrl}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="preview-loading-state">
            <span className="loading-spinner">⚡</span>
            <p>Fetching latest 5 articles from feed...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="preview-error-state">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Articles List */}
        {!isLoading && !error && (
          <div className="preview-articles-list">
            {articles.length === 0 ? (
              <p className="no-articles-msg">No articles currently available in this feed.</p>
            ) : (
              articles.map((item, idx) => {
                const formattedDate = item.published_at
                  ? new Date(item.published_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '';
                const cleanArticleTitle = decodeHtmlEntities(item.title);

                return (
                  <article key={item.guid || idx} className="preview-article-card">
                    <div className="card-body-wrapper">
                      <div className="card-main-content">
                        <div className="card-header">
                          <span className="feed-title">
                            {parsedFeed ? decodeHtmlEntities(parsedFeed.title) : 'Preview'}
                          </span>
                          {formattedDate && (
                            <>
                              <span className="dot-sep">•</span>
                              <span className="publish-date">{formattedDate}</span>
                            </>
                          )}
                        </div>

                        <h4 className="article-title">{cleanArticleTitle}</h4>

                        {item.summary && (
                          <p className="article-snippet">
                            {decodeHtmlEntities(item.summary.replace(/<[^>]*>?/gm, ''))}
                          </p>
                        )}
                      </div>

                      {item.image_url && (
                        <div className="card-thumbnail-container">
                          <img
                            src={item.image_url}
                            alt=""
                            className="card-thumbnail"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="modal-footer preview-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>

          <button
            className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
            onClick={handleSubscribeClick}
            disabled={isSubscribed || isSubscribing}
          >
            {isSubscribing
              ? 'Subscribing...'
              : isSubscribed
              ? '✓ Already Subscribed'
              : '+ Subscribe to Feed'}
          </button>
        </div>
      </div>
    </div>
  );
};
