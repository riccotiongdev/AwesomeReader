'use client';

import React, { useState } from 'react';
import { Folder, Feed } from '@/types';
import { decodeHtmlEntities } from '@/lib/utils/html-decoder';

interface SidebarDrawerProps {
  folders: Folder[];
  feeds: Feed[];
  selectedFolderId: string | null;
  selectedFeedId: string | null;
  onSelectAllFeeds: () => void;
  onSelectFolder: (folderId: string) => void;
  onSelectFeed: (feedId: string) => void;
  onOpenAddFeed: () => void;
  onOpenExplore: () => void;
  onOpenCreateFolder: () => void;
  onMoveFeedToFolder: (feedId: string, folderId: string | null) => Promise<void>;
  onDeleteFeed: (feedId: string, feedTitle: string) => Promise<void>;
  onDeleteFolder: (folderId: string, folderName: string) => Promise<void>;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  totalUnreadCount: number;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  folders,
  feeds,
  selectedFolderId,
  selectedFeedId,
  onSelectAllFeeds,
  onSelectFolder,
  onSelectFeed,
  onOpenAddFeed,
  onOpenExplore,
  onOpenCreateFolder,
  onMoveFeedToFolder,
  onDeleteFeed,
  onDeleteFolder,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
  totalUnreadCount,
}) => {
  const [activeMenuFeedId, setActiveMenuFeedId] = useState<string | null>(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [draggedOverFolderId, setDraggedOverFolderId] = useState<string | null | '__ROOT__'>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const isAllSelected = !selectedFolderId && !selectedFeedId;

  // Folders start collapsed; tapping a folder (or its arrow) expands it.
  const toggleFolderExpand = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, feedId: string) => {
    e.dataTransfer.setData('text/plain', feedId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleFolderDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDraggedOverFolderId(null);
    const feedId = e.dataTransfer.getData('text/plain');
    if (feedId) {
      onMoveFeedToFolder(feedId, targetFolderId);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="mobile-overlay" onClick={onCloseMobile} />
      )}

      <aside className={`sidebar ${isOpenMobile ? 'open mobile-open' : ''}`}>
        {/* Mobile-Only Close Drawer Bar (No duplicate logo) */}
        {isOpenMobile && (
          <div className="sidebar-header-mobile">
            <span className="sidebar-mobile-title">Menu</span>
            <button className="close-drawer-btn" onClick={onCloseMobile}>
              ×
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          {/* Main All Feeds Item */}
          <button
            className={`nav-item all-feeds-item ${isAllSelected ? 'active' : ''} ${
              draggedOverFolderId === '__ROOT__' ? 'drag-over' : ''
            }`}
            onClick={() => {
              onSelectAllFeeds();
              onCloseMobile();
            }}
            onDragOver={handleDragOver}
            onDragEnter={() => setDraggedOverFolderId('__ROOT__')}
            onDragLeave={() => setDraggedOverFolderId(null)}
            onDrop={(e) => handleFolderDrop(e, null)}
          >
            <span className="nav-icon">📚</span>
            <span className="nav-label">All Feeds</span>
            {Boolean(totalUnreadCount) && (
              <span className="badge">{totalUnreadCount}</span>
            )}
          </button>

          {/* Clean Action Utilities Section */}
          <div className="sidebar-actions-group">
            <button
              className="nav-item action-nav-item primary"
              onClick={() => {
                onOpenAddFeed();
                onCloseMobile();
              }}
            >
              <span className="nav-icon">➕</span>
              <span className="nav-label">Add New Feed</span>
            </button>

            <button
              className="nav-item action-nav-item"
              onClick={() => {
                onOpenExplore();
                onCloseMobile();
              }}
            >
              <span className="nav-icon">🧭</span>
              <span className="nav-label">Explore Directory</span>
            </button>
          </div>

          <div className="sidebar-section-divider" />

          {/* Subscriptions & Folders Header */}
          <div className="sidebar-section-header">
            <span>FOLDERS & FEEDS</span>
            <button
              className="icon-btn-small"
              onClick={onOpenCreateFolder}
              title="Create new folder"
            >
              +
            </button>
          </div>

          {/* Folders List with Nested Feeds */}
          {folders.map((folder) => {
            const isFolderActive = selectedFolderId === folder.id;
            const folderFeeds = feeds.filter((f) => f.folder_id === folder.id);
            const folderUnreadCount = folderFeeds.reduce(
              (sum, f) => sum + (f.unread_count || 0),
              0
            );
            const isTargetedByDrag = draggedOverFolderId === folder.id;
            const isFolderMenuOpen = activeMenuFolderId === folder.id;
            const isExpanded = expandedFolderIds.has(folder.id);

            return (
              <div key={folder.id} className="folder-group">
                <div className="folder-item-wrapper">
                  <button
                    className={`nav-item folder-item ${isFolderActive ? 'active' : ''} ${
                      isTargetedByDrag ? 'drag-over' : ''
                    }`}
                    onClick={() => {
                      if (!expandedFolderIds.has(folder.id)) {
                        toggleFolderExpand(folder.id);
                      }
                      onSelectFolder(folder.id);
                      onCloseMobile();
                    }}
                    onDragOver={handleDragOver}
                    onDragEnter={() => setDraggedOverFolderId(folder.id)}
                    onDragLeave={() => setDraggedOverFolderId(null)}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
                  >
                    <span
                      className="folder-toggle-arrow"
                      onClick={(e) => toggleFolderExpand(folder.id, e)}
                      title={isExpanded ? 'Collapse folder' : 'Expand folder'}
                    >
                      {isExpanded ? '▾' : '▸'}
                    </span>
                    <span className="nav-icon">{isExpanded ? '📂' : '📁'}</span>
                    <span className="nav-label">{decodeHtmlEntities(folder.name)}</span>
                    {Boolean(folderUnreadCount) && (
                      <span className="badge">{folderUnreadCount}</span>
                    )}
                  </button>

                  <button
                    className="feed-menu-btn"
                    title="Manage folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuFolderId(isFolderMenuOpen ? null : folder.id);
                    }}
                  >
                    ⋮
                  </button>

                  {isFolderMenuOpen && (
                    <div className="feed-popover-menu animate-fade-in">
                      <button
                        className="menu-option danger"
                        onClick={() => {
                          setActiveMenuFolderId(null);
                          onDeleteFolder(folder.id, folder.name);
                        }}
                      >
                        🗑 Delete Folder
                      </button>
                    </div>
                  )}
                </div>

                {/* Feeds inside Folder (Only shown when expanded) */}
                {isExpanded && (
                  <div className="folder-feeds-list indented animate-fade-in">
                    {folderFeeds.map((feed) => {
                      const isFeedActive = selectedFeedId === feed.id;
                      const isMenuOpen = activeMenuFeedId === feed.id;
                      const cleanTitle = decodeHtmlEntities(feed.title);

                      return (
                        <div key={feed.id} className="feed-item-wrapper">
                          <button
                            className={`nav-item feed-item ${isFeedActive ? 'active' : ''}`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, feed.id)}
                            onClick={() => {
                              onSelectFeed(feed.id);
                              onCloseMobile();
                            }}
                          >
                            <span className="nav-icon">📡</span>
                            <span className="nav-label" title={cleanTitle}>{cleanTitle}</span>
                            {Boolean(feed.unread_count) && (
                              <span className="badge mini">{feed.unread_count}</span>
                            )}
                          </button>

                          <button
                            className="feed-menu-btn"
                            title="Manage subscription"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuFeedId(isMenuOpen ? null : feed.id);
                            }}
                          >
                            ⋮
                          </button>

                          {isMenuOpen && (
                            <div className="feed-popover-menu animate-fade-in">
                              <div className="menu-header">Move to Folder</div>
                              <button
                                className={`menu-option ${!feed.folder_id ? 'active' : ''}`}
                                onClick={() => {
                                  setActiveMenuFeedId(null);
                                  onMoveFeedToFolder(feed.id, null);
                                }}
                              >
                                📄 Uncategorized (Root)
                              </button>
                              {folders.map((f) => (
                                <button
                                  key={f.id}
                                  className={`menu-option ${feed.folder_id === f.id ? 'active' : ''}`}
                                  onClick={() => {
                                    setActiveMenuFeedId(null);
                                    onMoveFeedToFolder(feed.id, f.id);
                                  }}
                                >
                                  📁 {decodeHtmlEntities(f.name)}
                                </button>
                              ))}

                              <div className="menu-divider" />

                              <button
                                className="menu-option danger"
                                onClick={() => {
                                  setActiveMenuFeedId(null);
                                  onDeleteFeed(feed.id, feed.title);
                                }}
                              >
                                🗑 Unsubscribe
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root Uncategorized Feeds */}
          <div className="root-feeds-list">
            {feeds
              .filter((f) => !f.folder_id)
              .map((feed) => {
                const isFeedActive = selectedFeedId === feed.id;
                const isMenuOpen = activeMenuFeedId === feed.id;
                const cleanTitle = decodeHtmlEntities(feed.title);

                return (
                  <div key={feed.id} className="feed-item-wrapper">
                    <button
                      className={`nav-item feed-item ${isFeedActive ? 'active' : ''}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, feed.id)}
                      onClick={() => {
                        onSelectFeed(feed.id);
                        onCloseMobile();
                      }}
                    >
                      <span className="nav-icon">📡</span>
                      <span className="nav-label" title={cleanTitle}>{cleanTitle}</span>
                      {Boolean(feed.unread_count) && (
                        <span className="badge mini">{feed.unread_count}</span>
                      )}
                    </button>

                    <button
                      className="feed-menu-btn"
                      title="Manage subscription"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuFeedId(isMenuOpen ? null : feed.id);
                      }}
                    >
                      ⋮
                    </button>

                    {isMenuOpen && (
                      <div className="feed-popover-menu animate-fade-in">
                        <span className="menu-header">Move to Folder:</span>
                        {folders.map((f) => (
                          <button
                            key={f.id}
                            className="menu-option"
                            onClick={() => {
                              onMoveFeedToFolder(feed.id, f.id);
                              setActiveMenuFeedId(null);
                            }}
                          >
                            📁 {f.name}
                          </button>
                        ))}
                        <div className="menu-divider" />
                        <button
                          className="menu-option danger"
                          onClick={() => {
                            setActiveMenuFeedId(null);
                            onDeleteFeed(feed.id, feed.title);
                          }}
                        >
                          🗑 Delete Subscription
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </nav>

        {/* Sidebar Footer: Settings */}
        <div className="sidebar-footer">
          <button
            className="nav-item action-nav-item"
            onClick={onOpenSettings}
            title="Settings"
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
