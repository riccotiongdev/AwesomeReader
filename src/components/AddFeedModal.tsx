'use client';

import React, { useState } from 'react';
import { Folder } from '@/types';

interface AddFeedModalProps {
  isOpen: boolean;
  folders: Folder[];
  onClose: () => void;
  onAddFeed: (feedUrl: string, folderId?: string, newFolderName?: string) => Promise<void>;
  isLoading: boolean;
}

export const AddFeedModal: React.FC<AddFeedModalProps> = ({
  isOpen,
  folders,
  onClose,
  onAddFeed,
  isLoading,
}) => {
  const [feedUrl, setFeedUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    if (selectedFolderId === '__NEW__') {
      if (!newFolderName.trim()) return;
      await onAddFeed(feedUrl.trim(), undefined, newFolderName.trim());
    } else {
      await onAddFeed(feedUrl.trim(), selectedFolderId || undefined);
    }

    setFeedUrl('');
    setSelectedFolderId('');
    setNewFolderName('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Subscribe to RSS Feed</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>RSS / Atom / JSON Feed URL</label>
            <input
              type="url"
              placeholder="https://example.com/feed.xml"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Folder (Optional)</label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
            >
              <option value="">No Folder (Root Subscriptions)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
              <option value="__NEW__">➕ Create New Folder...</option>
            </select>
          </div>

          {selectedFolderId === '__NEW__' && (
            <div className="form-group animate-fade-in">
              <label>New Folder Name</label>
              <input
                type="text"
                placeholder="e.g. Tech, News, Personal"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'Adding Feed...' : 'Subscribe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
