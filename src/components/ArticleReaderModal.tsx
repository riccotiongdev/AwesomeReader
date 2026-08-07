'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Article } from '@/types';
import { bodyLeadsWithImage } from '@/lib/utils/hero-image';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NavigationBarPluginInterface {
  setColor(options: { color: string; darkButtons?: boolean }): Promise<void>;
}

const NavigationBar = registerPlugin<NavigationBarPluginInterface>('NavigationBar');

interface ArticleReaderModalProps {
  article: Article | null;
  feedTitle?: string;
  theme: 'oled' | 'sepia' | 'light';
  onClose: () => void;
  onToggleStar: (articleId: string, currentStarred: boolean) => void;
  onExtractFullText: (articleId: string) => Promise<void>;
  isExtracting: boolean;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  article,
  feedTitle = 'RSS Feed',
  theme,
  onClose,
  onToggleStar,
  onExtractFullText,
  isExtracting,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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
  const [typographyOpen, setTypographyOpen] = useState(false);
  const typographyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('awesomereader_reader_font', fontFamily);
      localStorage.setItem('awesomereader_reader_size', fontSize.toString());
    } catch (e) {
      console.warn('Failed to save reader preferences:', e);
    }
  }, [fontFamily, fontSize]);

  // System bar color sync for Reader Modal Theme
  useEffect(() => {
    if (!typographyOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (typographyRef.current && !typographyRef.current.contains(e.target as Node)) {
        setTypographyOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [typographyOpen]);

  useEffect(() => {
    if (!article) return;

    const themeColors: Record<string, string> = {
      oled: '#000000',
      sepia: '#fbf0d9',
      light: '#ffffff',
    };
    const activeColor = themeColors[theme] || '#000000';
    const isLight = theme === 'sepia' || theme === 'light';

    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({ color: activeColor }).catch(() => {});
      StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark }).catch(() => {});
      NavigationBar.setColor({ color: activeColor, darkButtons: isLight }).catch(() => {});
    }
  }, [article, theme]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (contentRef.current && progressBarRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            const totalScroll = scrollHeight - clientHeight;
            const currentProgress = totalScroll <= 0 ? 100 : (scrollTop / totalScroll) * 100;
            progressBarRef.current.style.width = `${Math.min(100, Math.max(0, currentProgress))}%`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const currentEl = contentRef.current;
    if (currentEl) {
      currentEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (currentEl) {
        currentEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [article]);

  const contentToDisplay = article?.full_content || article?.content || article?.summary || '';
  const bodyLeadsWithHero = useMemo(
    () => bodyLeadsWithImage(contentToDisplay, article?.image_url),
    [contentToDisplay, article]
  );

  if (!article) return null;

  return (
    <div className="reader-modal-backdrop animate-fade-in" data-reader-theme={theme}>
      {/* Top Reading Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" ref={progressBarRef} style={{ width: '0%' }} />
      </div>

      {/* Reader Control Header */}
      <header className="reader-header">
        <button className="icon-btn close-btn" onClick={onClose} title="Close Reader">
          ✕
        </button>

        <div className="reader-controls">
          {/* Typography Menu */}
          <div className="typography-menu" ref={typographyRef}>
            <button
              className={`icon-btn typography-btn ${typographyOpen ? 'active' : ''}`}
              onClick={() => setTypographyOpen((o) => !o)}
              title="Typography"
              aria-expanded={typographyOpen}
              aria-haspopup="true"
            >
              Aa
            </button>

            {typographyOpen && (
              <div className="typography-popover">
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
                    A−
                  </button>
                  <span className="size-val">{fontSize}px</span>
                  <button className="size-btn" onClick={() => setFontSize(Math.min(26, fontSize + 2))}>
                    A+
                  </button>
                </div>
              </div>
            )}
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

          {/* Hero Lead Image Before Text Content — skipped when the body already leads with the same image */}
          {article.image_url && !bodyLeadsWithHero && (
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
