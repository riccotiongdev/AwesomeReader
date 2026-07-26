'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Article } from '@/types';

interface ArticleReaderModalProps {
  article: Article | null;
  feedTitle?: string;
  onClose: () => void;
  onToggleStar: (articleId: string, currentStarred: boolean) => void;
  onExtractFullText: (articleId: string) => Promise<void>;
  isExtracting: boolean;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  article,
  feedTitle = 'RSS Feed',
  onClose,
  onToggleStar,
  onExtractFullText,
  isExtracting,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('awesomereader_reader_font');
      if (saved === 'serif' || saved === 'sans' || saved === 'mono') return saved;
    }
    return 'serif';
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('awesomereader_reader_size');
      if (saved) return parseInt(saved, 10);
    }
    return 18;
  });
  const [readerTheme, setReaderTheme] = useState<'oled' | 'sepia' | 'paper' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('awesomereader_reader_theme');
      if (saved === 'oled' || saved === 'sepia' || saved === 'paper' || saved === 'light') return saved;
    }
    return 'oled';
  });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('awesomereader_reader_font', fontFamily);
      localStorage.setItem('awesomereader_reader_size', fontSize.toString());
      localStorage.setItem('awesomereader_reader_theme', readerTheme);
    } catch (e) {
      console.warn('Failed to save reader preferences:', e);
    }
  }, [fontFamily, fontSize, readerTheme]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll <= 0) {
        setScrollProgress(100);
      } else {
        const currentProgress = (scrollTop / totalScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    const currentEl = contentRef.current;
    if (currentEl) {
      currentEl.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentEl) {
        currentEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [article]);

  if (!article) return null;

  const contentToDisplay = article.full_content || article.content || article.summary || '';

  return (
    <div className="reader-modal-backdrop animate-fade-in" data-reader-theme={readerTheme}>
      {/* Top Reading Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Reader Control Header */}
      <header className="reader-header">
        <button className="icon-btn close-btn" onClick={onClose} title="Close Reader">
          ✕
        </button>

        <div className="reader-controls">
          {/* Typography Controls */}
          <div className="font-controls">
            <button
              className={`font-btn ${fontFamily === 'serif' ? 'active' : ''}`}
              onClick={() => setFontFamily('serif')}
              title="Serif font"
            >
              Georgia
            </button>
            <button
              className={`font-btn ${fontFamily === 'sans' ? 'active' : ''}`}
              onClick={() => setFontFamily('sans')}
              title="Sans-serif font"
            >
              Sans
            </button>
            <button
              className={`font-btn ${fontFamily === 'mono' ? 'active' : ''}`}
              onClick={() => setFontFamily('mono')}
              title="Monospace font"
            >
              Mono
            </button>
          </div>

          <div className="size-controls">
            <button className="size-btn" onClick={() => setFontSize(Math.max(14, fontSize - 2))}>
              A-
            </button>
            <span className="size-val">{fontSize}px</span>
            <button className="size-btn" onClick={() => setFontSize(Math.min(26, fontSize + 2))}>
              A+
            </button>
          </div>

          {/* Theme Palette */}
          <div className="theme-palette">
            <button
              className={`theme-dot oled ${readerTheme === 'oled' ? 'active' : ''}`}
              onClick={() => setReaderTheme('oled')}
              title="OLED Dark"
            />
            <button
              className={`theme-dot sepia ${readerTheme === 'sepia' ? 'active' : ''}`}
              onClick={() => setReaderTheme('sepia')}
              title="Sepia Paper"
            />
            <button
              className={`theme-dot paper ${readerTheme === 'paper' ? 'active' : ''}`}
              onClick={() => setReaderTheme('paper')}
              title="Warm Paper"
            />
            <button
              className={`theme-dot light ${readerTheme === 'light' ? 'active' : ''}`}
              onClick={() => setReaderTheme('light')}
              title="Clean Light"
            />
          </div>

          {/* Star toggle */}
          <button
            className={`star-action-btn ${article.is_starred ? 'starred' : ''}`}
            onClick={() => onToggleStar(article.id, article.is_starred)}
            title="Star article"
          >
            {article.is_starred ? '★' : '☆'}
          </button>
        </div>
      </header>

      {/* Main Article Reading Container */}
      <main className="reader-scroll-area" ref={contentRef}>
        <article className={`reader-article-container font-${fontFamily}`} style={{ fontSize: `${fontSize}px` }}>
          <div className="article-meta font-sans">
            <span className="feed-badge">{feedTitle}</span>
            {article.author && <span className="author">by {article.author}</span>}
            <span className="date">
              {new Date(article.published_at).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <h1 className="reader-title">{article.title}</h1>

          <div className="source-link-bar font-sans">
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="original-link">
              View original ↗
            </a>

            <a
              href={`https://archive.ph/latest/${encodeURIComponent(article.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="archive-link-btn"
              title="Open cached full-text version on Archive Today"
            >
              🌐 Web Archive ↗
            </a>

            {!article.full_content && (
              <button
                className="extract-full-btn"
                onClick={() => onExtractFullText(article.id)}
                disabled={isExtracting}
              >
                {isExtracting ? 'Extracting...' : '⚡ Extract Text'}
              </button>
            )}
          </div>

          {/* Hero Lead Image Before Text Content */}
          {article.image_url && (
            <div className="reader-hero-image-wrapper">
              <img
                src={article.image_url}
                alt={article.title}
                className="reader-hero-image"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div
            className="reader-body"
            dangerouslySetInnerHTML={{ __html: contentToDisplay }}
          />
        </article>
      </main>
    </div>
  );
};
