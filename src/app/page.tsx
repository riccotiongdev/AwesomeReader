'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { SidebarDrawer } from '@/components/SidebarDrawer';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleReaderModal } from '@/components/ArticleReaderModal';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AddFeedModal } from '@/components/AddFeedModal';
import { OPMLModal } from '@/components/OPMLModal';
import { CreateFolderModal } from '@/components/CreateFolderModal';
import { ExploreFeedsModal } from '@/components/ExploreFeedsModal';
import { FeedPreviewModal } from '@/components/FeedPreviewModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ToastContainer, ToastItem } from '@/components/ToastContainer';
import { Folder, Feed, Article } from '@/types';
import { clientDb } from '@/lib/db/dexie-db';
import { fetchAndParseFeed } from '@/lib/services/feed-crawler';
import { refreshFeedsForView } from '@/lib/services/refresh';
import { parseOPML } from '@/lib/services/opml';
import { extractFullArticle } from '@/lib/services/readability';

import { decodeHtmlEntities } from '@/lib/utils/html-decoder';

import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NavigationBarPluginInterface {
  setColor(options: { color: string; darkButtons?: boolean }): Promise<void>;
}

const NavigationBar = registerPlugin<NavigationBarPluginInterface>('NavigationBar');

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'starred'>('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'oled' | 'sepia' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('awesomereader_theme');
      if (saved === 'oled' || saved === 'sepia' || saved === 'light') {
        return saved;
      }
    }
    return 'oled';
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // In-app confirm + toast (replaces window.confirm/alert, which don't work in native webviews)
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const askConfirm = useCallback(
    (
      options: { title: string; message: string; confirmLabel?: string; danger?: boolean },
      onConfirm: () => void
    ) => {
      setConfirmState({ ...options, onConfirm });
    },
    []
  );

  // Modals
  const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isOpmlOpen, setIsOpmlOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [isImportingOpml, setIsImportingOpml] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Reader Focus Article & Main Scroll Ref
  const mainRef = useRef<HTMLElement | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [viewUnreadIds, setViewUnreadIds] = useState<Set<string>>(new Set());

  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, []);

  // Feed Preview Focus
  const [previewFeedUrl, setPreviewFeedUrl] = useState<string | null>(null);
  const [previewFeedTitle, setPreviewFeedTitle] = useState<string | undefined>(undefined);

  // Android Hardware Back Button Listener
  useEffect(() => {
    const handleBackButton = App.addListener('backButton', () => {
      if (activeArticle) {
        setActiveArticle(null);
      } else if (previewFeedUrl) {
        setPreviewFeedUrl(null);
      } else if (isExploreOpen) {
        setIsExploreOpen(false);
      } else if (isCreateFolderOpen) {
        setIsCreateFolderOpen(false);
      } else if (isAddFeedOpen) {
        setIsAddFeedOpen(false);
      } else if (isOpmlOpen) {
        setIsOpmlOpen(false);
      } else if (isSidebarMobileOpen) {
        setIsSidebarMobileOpen(false);
      } else {
        App.exitApp();
      }
    });

    return () => {
      handleBackButton.then((h) => h.remove());
    };
  }, [activeArticle, isCreateFolderOpen, isAddFeedOpen, isOpmlOpen, isSidebarMobileOpen]);

  // Theme Sync & Persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('awesomereader_theme', theme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }

    if (Capacitor.isNativePlatform()) {
      const themeColors: Record<string, string> = {
        oled: '#000000',
        sepia: '#fbf0d9',
        light: '#ffffff',
      };
      const isLight = theme === 'sepia' || theme === 'light';
      const activeColor = themeColors[theme] || '#000000';
      StatusBar.setBackgroundColor({ color: activeColor }).catch(() => {});
      StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark }).catch(() => {});
      NavigationBar.setColor({ color: activeColor, darkButtons: isLight }).catch(() => {});
    }
  }, [theme]);

  // Load Folders & Feeds from Client IndexedDB
  const loadFeedsAndFolders = useCallback(async () => {
    const dbFolders = await clientDb.getFolders();
    const dbFeeds = await clientDb.getFeeds();
    setFolders(dbFolders);
    setFeeds(dbFeeds);
  }, []);

  // Load Articles from Client IndexedDB
  const loadArticles = useCallback(async () => {
    const list = await clientDb.getArticles({
      feedId: selectedFeedId || undefined,
      folderId: selectedFolderId || undefined,
    });
    setArticles(list);

    // Snapshot unread IDs at load time so read items stay in list until feed change/refresh
    const initialUnreadIds = new Set(list.filter((a) => !a.is_read).map((a) => a.id));
    setViewUnreadIds(initialUnreadIds);

    // Scroll to top of list when switching feed or folder
    scrollToTop();
  }, [selectedFeedId, selectedFolderId, scrollToTop]);

  // Create standalone folder
  const handleCreateFolder = async (folderName: string) => {
    setIsCreatingFolder(true);
    try {
      await clientDb.createFolder(folderName);
      await loadFeedsAndFolders();
    } catch (err: any) {
      showToast(`Failed to create folder: ${err.message}`, 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Add single RSS feed directly in client
  const handleAddFeed = async (feedUrl: string, folderId?: string, newFolderName?: string) => {
    setIsAddingFeed(true);
    try {
      let targetFolderId = folderId;

      if (newFolderName) {
        const createdFolder = await clientDb.createFolder(newFolderName);
        targetFolderId = createdFolder.id;
      }

      const crawlResult = await fetchAndParseFeed(feedUrl);
      if (crawlResult.result) {
        const { feedTitle, siteUrl, articles: crawlArticles } = crawlResult.result;
        const feed = await clientDb.addFeed({
          title: feedTitle,
          feed_url: feedUrl,
          site_url: siteUrl,
          folder_id: targetFolderId || null,
        });

        await clientDb.saveArticles(
          crawlArticles.map((art) => ({
            ...art,
            published_at: art.publishedAt,
            feed_id: feed.id,
          }))
        );

        await loadFeedsAndFolders();
        await loadArticles();
      }
    } catch (err: any) {
      showToast(`Failed to subscribe to feed: ${err.message}`, 'error');
    } finally {
      setIsAddingFeed(false);
    }
  };

  // Move feed to folder (or root)
  const handleMoveFeedToFolder = async (feedId: string, folderId: string | null) => {
    try {
      await clientDb.moveFeedToFolder(feedId, folderId);
      await loadFeedsAndFolders();
      await loadArticles();
    } catch (err: any) {
      showToast(`Failed to move feed: ${err.message}`, 'error');
    }
  };

  // Delete feed subscription and purge all stored content
  const handleDeleteFeed = async (feedId: string, feedTitle: string) => {
    askConfirm(
      {
        title: 'Delete subscription',
        message: `Are you sure you want to delete subscription "${feedTitle}" and all stored content?`,
        confirmLabel: 'Delete',
        danger: true,
      },
      async () => {
        try {
          await clientDb.deleteFeed(feedId);
          if (selectedFeedId === feedId) {
            setSelectedFeedId(null);
          }
          await loadFeedsAndFolders();
          await loadArticles();
          showToast(`Deleted "${feedTitle}"`, 'success');
        } catch (err: any) {
          showToast(`Failed to delete subscription: ${err.message}`, 'error');
        }
      }
    );
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    askConfirm(
      {
        title: 'Delete folder',
        message: `Are you sure you want to delete folder "${folderName}"? (Feeds inside will be moved to root)`,
        confirmLabel: 'Delete',
        danger: true,
      },
      async () => {
        try {
          await clientDb.deleteFolder(folderId);
          if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
          }
          await loadFeedsAndFolders();
          showToast(`Deleted "${folderName}"`, 'success');
        } catch (err: any) {
          showToast(`Failed to delete folder: ${err.message}`, 'error');
        }
      }
    );
  };

  // Initial Seed & Data Fetch
  useEffect(() => {
    const initializeData = async () => {
      setIsRefreshing(true);
      await loadFeedsAndFolders();

      const existingFeeds = await clientDb.getFeeds();
      if (existingFeeds.length === 0) {
        // Seed default initial feed for instant onboarding
        try {
          await handleAddFeed('https://daringfireball.net/feeds/main');
        } catch (e) {
          console.warn('Initial feed seed note:', e);
        }
      }

      await loadArticles();
      setIsRefreshing(false);
    };

    initializeData();
  }, []);

  // Auto-reload articles when switching selected feed or folder
  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Unified scoped refresh: refreshes only the feeds in the current view
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const currentFeeds = await clientDb.getFeeds();

      const outcomes = await refreshFeedsForView(
        currentFeeds,
        { selectedFeedId, selectedFolderId },
        {
          fetchFeed: fetchAndParseFeed,
          saveArticles: (articles) => clientDb.saveArticles(articles),
          updateFeedCrawlState: (feedId, state) => clientDb.updateFeedCrawlState(feedId, state),
          now: () => new Date().toISOString(),
        }
      );

      for (const outcome of outcomes) {
        if (outcome.status === 'error') {
          const feed = currentFeeds.find((f) => f.id === outcome.feedId);
          console.warn(`Error refreshing feed ${feed?.title || outcome.feedId}:`, outcome.error);
        }
      }

      await loadFeedsAndFolders();
      await loadArticles();
      scrollToTop();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pull-to-refresh triggers the same scoped refresh, flagged so the gesture indicator owns the visuals
  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      await handleRefresh();
    } finally {
      setIsPullRefreshing(false);
    }
  };

  // Import OPML file
  const handleImportOpml = async (file: File) => {
    setIsImportingOpml(true);
    try {
      const xmlText = await file.text();
      const structure = parseOPML(xmlText);
      let importedCount = 0;

      // Process Root Feeds
      for (const feed of structure.rootFeeds) {
        await handleAddFeed(feed.xmlUrl);
        importedCount++;
      }

      // Process Folders
      for (const folderItem of structure.folders) {
        const folder = await clientDb.createFolder(folderItem.name);
        for (const feed of folderItem.feeds) {
          await handleAddFeed(feed.xmlUrl, folder.id);
          importedCount++;
        }
      }

      showToast(`Successfully imported OPML! Imported ${importedCount} feeds.`, 'success');
      await loadFeedsAndFolders();
      await loadArticles();
    } catch (err: any) {
      showToast(`OPML import failed: ${err.message}`, 'error');
    } finally {
      setIsImportingOpml(false);
    }
  };

  // Toggle Read state
  const handleToggleRead = async (articleId: string, currentRead: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic UI update
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_read: !currentRead } : a))
    );

    if (activeArticle && activeArticle.id === articleId) {
      setActiveArticle((prev) => (prev ? { ...prev, is_read: !currentRead } : null));
    }

    await clientDb.updateArticleState(articleId, { is_read: !currentRead });
    await loadFeedsAndFolders();
  };

  // Toggle Star state
  const handleToggleStar = async (articleId: string, currentStarred: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_starred: !currentStarred } : a))
    );

    if (activeArticle && activeArticle.id === articleId) {
      setActiveArticle((prev) => (prev ? { ...prev, is_starred: !currentStarred } : null));
    }

    await clientDb.updateArticleState(articleId, { is_starred: !currentStarred });
  };

  // Mark All Currently Filtered Articles as Read and auto-navigate to next feed with unreads
  const handleMarkAllAsRead = () => {
    const unreadArticleIds = filteredArticles.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadArticleIds.length === 0) return;

    askConfirm(
      {
        title: 'Mark all as read',
        message: `Mark ${unreadArticleIds.length} article(s) in this view as read?`,
        confirmLabel: 'Mark as Read',
      },
      async () => {
        await clientDb.markArticlesAsRead(unreadArticleIds);

        // Refresh feeds/folders from DB to get updated unread counts
        const updatedFeeds = await clientDb.getFeeds();
        const updatedFolders = await clientDb.getFolders();
        setFeeds(updatedFeeds);
        setFolders(updatedFolders);

        // Update the visible list immediately so cards no longer show as unread
        setArticles((prev) =>
          prev.map((a) =>
            unreadArticleIds.includes(a.id) ? { ...a, is_read: true } : a
          )
        );

        // Find next feed with unread articles
        let nextFeedId: string | null = null;

        if (selectedFeedId) {
          const currentIndex = updatedFeeds.findIndex((f) => f.id === selectedFeedId);
          // Look for the next feed after currentIndex that has unread_count > 0
          const remainingFeeds = updatedFeeds.slice(currentIndex + 1);
          const nextFeedWithUnread = remainingFeeds.find((f) => (f.unread_count || 0) > 0);

          if (nextFeedWithUnread) {
            nextFeedId = nextFeedWithUnread.id;
          } else {
            // If no next feed after current, check from start of list before current
            const earlierFeeds = updatedFeeds.slice(0, currentIndex);
            const earlierFeedWithUnread = earlierFeeds.find((f) => (f.unread_count || 0) > 0);
            if (earlierFeedWithUnread) {
              nextFeedId = earlierFeedWithUnread.id;
            }
          }
        } else if (selectedFolderId) {
          // If in a folder, check next feed with unread
          const unreadFeed = updatedFeeds.find((f) => (f.unread_count || 0) > 0);
          if (unreadFeed) {
            nextFeedId = unreadFeed.id;
          }
        }

        if (nextFeedId) {
          // Switch to the next feed with unread articles (selection change reloads the list)
          setSelectedFeedId(nextFeedId);
          setSelectedFolderId(null);
        } else {
          // No more feeds with unread articles -> Go to All Subscriptions
          setSelectedFeedId(null);
          setSelectedFolderId(null);
          await loadArticles();
        }

        showToast(`Marked ${unreadArticleIds.length} article(s) as read`, 'success');
      }
    );
  };

  // Open Article Reader
  const handleSelectArticle = (article: Article) => {
    setActiveArticle(article);
    if (!article.is_read) {
      handleToggleRead(article.id, false);
    }
  };

  // Full Article Extract via Readability
  const handleExtractFullText = async (articleId: string) => {
    setIsExtractingText(true);
    try {
      const articleToExtract = articles.find((a) => a.id === articleId) || activeArticle;
      if (!articleToExtract) throw new Error('Article not found');

      const extracted = await extractFullArticle(articleToExtract.url, { timeoutMs: 30000 });
      const newImageUrl = extracted.lead_image_url || articleToExtract.image_url || null;

      const updated = await clientDb.updateArticleState(articleId, {
        full_content: extracted.content,
        image_url: newImageUrl,
      });

      if (updated) {
        setActiveArticle(updated);
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? updated : a))
        );
      }
    } catch (err: any) {
      showToast(`Full text extraction failed: ${err.message}`, 'error');
    } finally {
      setIsExtractingText(false);
    }
  };

  // Re-sync viewUnreadIds when activeTab changes
  useEffect(() => {
    if (articles.length > 0) {
      const currentUnread = new Set(articles.filter((a) => !a.is_read).map((a) => a.id));
      setViewUnreadIds(currentUnread);
    }
    scrollToTop();
  }, [activeTab, scrollToTop]);

  // Filter Articles
  const filteredArticles = articles.filter((article) => {
    if (activeTab === 'unread') {
      const wasUnreadOnLoad = viewUnreadIds.has(article.id);
      if (article.is_read && !wasUnreadOnLoad) return false;
    } else if (activeTab === 'starred') {
      if (!article.is_starred) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = article.title.toLowerCase().includes(q);
      const summaryMatch = article.summary?.toLowerCase().includes(q);
      return titleMatch || summaryMatch;
    }

    return true;
  });

  const totalUnreadCount = feeds.reduce((sum, f) => sum + (f.unread_count || 0), 0);

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={handleRefresh}
        onToggleSidebar={() => setIsSidebarMobileOpen((prev) => !prev)}
        isRefreshing={isRefreshing}
      />

      <div className="main-content-container">
        <SidebarDrawer
          folders={folders}
          feeds={feeds}
          selectedFolderId={selectedFolderId}
          selectedFeedId={selectedFeedId}
          onSelectAllFeeds={() => {
            setSelectedFolderId(null);
            setSelectedFeedId(null);
          }}
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
            setSelectedFeedId(null);
          }}
          onSelectFeed={(feedId) => {
            setSelectedFeedId(feedId);
            setSelectedFolderId(null);
          }}
          onOpenAddFeed={() => setIsAddFeedOpen(true)}
          onOpenExplore={() => setIsExploreOpen(true)}
          onOpenOpml={() => setIsOpmlOpen(true)}
          onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
          onMoveFeedToFolder={handleMoveFeedToFolder}
          onDeleteFeed={handleDeleteFeed}
          onDeleteFolder={handleDeleteFolder}
          theme={theme}
          setTheme={(t) => setTheme(t as any)}
          isOpenMobile={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
          totalUnreadCount={totalUnreadCount}
        />

        <main className="timeline-area" ref={mainRef}>
          <PullToRefresh
            onRefresh={handlePullRefresh}
            isRefreshing={isRefreshing}
            isPullRefreshing={isPullRefreshing}
            containerRef={mainRef}
          />
          <div className="timeline-header">
            <h2>
              {decodeHtmlEntities(
                selectedFeedId
                  ? feeds.find((f) => f.id === selectedFeedId)?.title || 'Feed Articles'
                  : selectedFolderId
                  ? folders.find((f) => f.id === selectedFolderId)?.name || 'Folder Articles'
                  : 'All Subscriptions'
              )}
            </h2>
            <span className="count-badge">{filteredArticles.length} articles</span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">☕</span>
              <h3>No articles found</h3>
              <p>
                {activeTab === 'unread'
                  ? "You're all caught up! No unread articles in this view."
                  : activeTab === 'starred'
                  ? 'No starred articles yet. Click ★ on any article to save it.'
                  : 'Subscribe to feeds or import your OPML file to start reading.'}
              </p>
              <button className="add-btn-empty" onClick={() => setIsAddFeedOpen(true)}>
                + Subscribe to RSS Feed
              </button>
            </div>
          ) : (
            <div className="articles-list animate-fade-in">
              {filteredArticles.map((article) => {
                const feed = feeds.find((f) => f.id === article.feed_id);
                return (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    feedTitle={feed?.title}
                    onSelect={handleSelectArticle}
                    onToggleStar={handleToggleStar}
                    onToggleRead={handleToggleRead}
                  />
                );
              })}
            </div>
          )}

          {/* Floating Mark All as Read Action Button */}
          {filteredArticles.some((a) => !a.is_read) && (
            <button
              className="fab-mark-all-read animate-fade-in"
              onClick={handleMarkAllAsRead}
              title="Mark all articles in this view as read"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Mark All Read</span>
            </button>
          )}
        </main>
      </div>

      {/* Reader Modal Overlay */}
      <ArticleReaderModal
        article={activeArticle}
        feedTitle={feeds.find((f) => f.id === activeArticle?.feed_id)?.title}
        onClose={() => setActiveArticle(null)}
        onToggleStar={handleToggleStar}
        onExtractFullText={handleExtractFullText}
        isExtracting={isExtractingText}
      />

      {/* Explore Feeds Directory Modal */}
      <ExploreFeedsModal
        isOpen={isExploreOpen}
        onClose={() => setIsExploreOpen(false)}
        subscribedFeeds={feeds}
        onSubscribeFeed={async (feedUrl) => {
          await handleAddFeed(feedUrl);
        }}
        onPreviewFeed={(feedUrl, feedTitle) => {
          setPreviewFeedUrl(feedUrl);
          setPreviewFeedTitle(feedTitle);
        }}
        onNotify={showToast}
      />

      {/* Feed 5-Articles Preview Modal */}
      <FeedPreviewModal
        isOpen={Boolean(previewFeedUrl)}
        feedUrl={previewFeedUrl}
        feedTitle={previewFeedTitle}
        onClose={() => setPreviewFeedUrl(null)}
        onSubscribe={async (feedUrl) => {
          await handleAddFeed(feedUrl);
        }}
        isSubscribed={feeds.some((f) => f.feed_url.toLowerCase() === previewFeedUrl?.toLowerCase())}
        onNotify={showToast}
      />

      {/* Add Feed Modal */}
      <AddFeedModal
        isOpen={isAddFeedOpen}
        folders={folders}
        onClose={() => setIsAddFeedOpen(false)}
        onAddFeed={handleAddFeed}
        isLoading={isAddingFeed}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
        isLoading={isCreatingFolder}
      />

      {/* OPML Import / Export Modal */}
      <OPMLModal
        isOpen={isOpmlOpen}
        onClose={() => setIsOpmlOpen(false)}
        onImportOpml={handleImportOpml}
        isImporting={isImportingOpml}
        onNotify={showToast}
      />

      {/* In-app Confirm Dialog (replaces window.confirm, which is a no-op in native webviews) */}
      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          const action = confirmState?.onConfirm;
          setConfirmState(null);
          if (action) action();
        }}
      />

      {/* Toast notifications (replaces window.alert) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
