'use client';

import React, { useState, useEffect } from 'react';
import { Article } from '@/types';
import { fetchOgImageForArticle } from '@/lib/services/thumbnail-enricher';
import { decodeHtmlEntities } from '@/lib/utils/html-decoder';

interface ArticleCardProps {
  article: Article;
  feedTitle?: string;
  onSelect: (article: Article) => void;
  onToggleStar: (articleId: string, currentStarred: boolean, e: React.MouseEvent) => void;
  onToggleRead: (articleId: string, currentRead: boolean, e: React.MouseEvent) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  feedTitle = 'RSS Feed',
  onSelect,
  onToggleStar,
  onToggleRead,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(article.image_url || null);

  useEffect(() => {
    setImageUrl(article.image_url || null);

    if (!article.image_url) {
      let isMounted = true;
      fetchOgImageForArticle(article).then((foundUrl) => {
        if (isMounted && foundUrl) {
          setImageUrl(foundUrl);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [article]);

  const formattedDate = new Date(article.published_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const cleanFeedTitle = decodeHtmlEntities(feedTitle);
  const cleanArticleTitle = decodeHtmlEntities(article.title);

  return (
    <article
      className={`article-card ${article.is_read ? 'read' : 'unread'}`}
      onClick={() => onSelect(article)}
    >
      {/* TOP: Full-width Article Title */}
      <h3 className="article-title">{cleanArticleTitle}</h3>

      {/* MIDDLE: Thumbnail Left + Details / Abstract Right */}
      <div className="card-middle-row">
        {imageUrl && (
          <div className="card-left-thumbnail-wrapper animate-fade-in">
            <img
              src={imageUrl}
              alt=""
              className="card-left-thumbnail"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {article.summary && (
          <p
            className="article-snippet"
            dangerouslySetInnerHTML={{
              __html: decodeHtmlEntities(article.summary.replace(/<[^>]*>?/gm, ''))
            }}
          />
        )}
      </div>

      {/* BOTTOM: Feed / Article Date Left + Actions Right */}
      <div className="card-meta-row">
        <div className="meta-left">
          <span className="feed-title" title={cleanFeedTitle}>{cleanFeedTitle}</span>
          <span className="dot-sep">•</span>
          <span className="publish-date">{formattedDate}</span>
        </div>

        <div className="meta-actions">
          <button
            className={`star-btn ${article.is_starred ? 'starred' : ''}`}
            onClick={(e) => onToggleStar(article.id, article.is_starred, e)}
            title={article.is_starred ? 'Unstar' : 'Star'}
          >
            {article.is_starred ? '★' : '☆'}
          </button>

          <button
            className="read-toggle-btn"
            onClick={(e) => onToggleRead(article.id, article.is_read, e)}
            title={article.is_read ? 'Mark as unread' : 'Mark as read'}
          >
            {article.is_read ? 'Unread' : 'Read'}
          </button>
        </div>
      </div>
    </article>
  );
};
