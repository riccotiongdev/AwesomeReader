'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { SidebarDrawer } from '@/components/SidebarDrawer';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleReaderModal } from '@/components/ArticleReaderModal';
import { AddFeedModal } from '@/components/AddFeedModal';
import { OPMLModal } from '@/components/OPMLModal';
import { CreateFolderModal } from '@/components/CreateFolderModal';
import { ExploreFeedsModal } from '@/components/ExploreFeedsModal';
import { FeedPreviewModal } from '@/components/FeedPreviewModal';
import { Folder, Feed, Article } from '@/types';
import { clientDb } from '@/lib/db/dexie-db';
import { fetchAndParseFeed } from '@/lib/services/feed-crawler';
import { parseOPML } from '@/lib/services/opml';
import { extractFullArticle } from '@/lib/services/readability';

import { decodeHtmlEntities } from '@/lib/utils/html-decoder';

import { App } from '@capacitor/app';

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

  // Modals
  const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isOpmlOpen, setIsOpmlOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [isImportingOpml, setIsImportingOpml] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Reader Focus Article
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);

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
  }, [selectedFeedId, selectedFolderId]);

  // Create standalone folder
  const handleCreateFolder = async (folderName: string) => {
    setIsCreatingFolder(true);
    try {
      await clientDb.createFolder(folderName);
      await loadFeedsAndFolders();
    } catch (err: any) {
      alert(`Failed to create folder: ${err.message}`);
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
      alert(`Failed to subscribe to feed: ${err.message}`);
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
      alert(`Failed to move feed: ${err.message}`);
    }
  };

  // Delete feed subscription and purge all stored content
  const handleDeleteFeed = async (feedId: string, feedTitle: string) => {
    if (confirm(`Are you sure you want to delete subscription "${feedTitle}" and all stored content?`)) {
      try {
        await clientDb.deleteFeed(feedId);
        if (selectedFeedId === feedId) {
          setSelectedFeedId(null);
        }
        await loadFeedsAndFolders();
        await loadArticles();
      } catch (err: any) {
        alert(`Failed to delete subscription: ${err.message}`);
      }
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (confirm(`Are you sure you want to delete folder "${folderName}"? (Feeds inside will be moved to root)`)) {
      try {
        await clientDb.deleteFolder(folderId);
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        await loadFeedsAndFolders();
      } catch (err: any) {
        alert(`Failed to delete folder: ${err.message}`);
      }
    }
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

  // Refresh feeds
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const currentFeeds = await clientDb.getFeeds();

    for (const feed of currentFeeds) {
      try {
        const crawlResult = await fetchAndParseFeed(feed.feed_url, {
          etag: feed.etag || undefined,
          lastModified: feed.last_modified || undefined,
        });
        if (crawlResult.result) {
          await clientDb.saveArticles(
            crawlResult.result.articles.map((art) => ({
              ...art,
              published_at: art.publishedAt,
              feed_id: feed.id,
            }))
          );
        }
      } catch (err) {
        console.warn(`Error refreshing feed ${feed.title}:`, err);
      }
    }

    await loadFeedsAndFolders();
    await loadArticles();
    setIsRefreshing(false);
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

      alert(`Successfully imported OPML! Imported ${importedCount} feeds.`);
      await loadFeedsAndFolders();
      await loadArticles();
    } catch (err: any) {
      alert(`OPML import failed: ${err.message}`);
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

      const extracted = await extractFullArticle(articleToExtract.url);
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
      alert(`Full text extraction failed: ${err.message}`);
    } finally {
      setIsExtractingText(false);
    }
  };

  // Filter Articles
  const filteredArticles = articles.filter((article) => {
    if (activeTab === 'unread' && article.is_read) return false;
    if (activeTab === 'starred' && !article.is_starred) return false;

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

        <main className="timeline-area">
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
      />
    </div>
  );
}
