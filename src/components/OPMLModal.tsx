'use client';

import React, { useState } from 'react';
import { generateOPML } from '@/lib/services/opml';
import { clientDb } from '@/lib/db/dexie-db';

interface OPMLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportOpml: (file: File) => Promise<void>;
  isImporting: boolean;
}

export const OPMLModal: React.FC<OPMLModalProps> = ({
  isOpen,
  onClose,
  onImportOpml,
  isImporting,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await onImportOpml(selectedFile);
    setSelectedFile(null);
    onClose();
  };

  const handleExportDownload = async () => {
    const folders = await clientDb.getFolders();
    const feeds = await clientDb.getFeeds();

    const rootFeeds = feeds
      .filter((f) => !f.folder_id)
      .map((f) => ({ title: f.title, xmlUrl: f.feed_url, htmlUrl: f.site_url || undefined }));

    const opmlFolders = folders.map((folder) => ({
      name: folder.name,
      feeds: feeds
        .filter((f) => f.folder_id === folder.id)
        .map((f) => ({ title: f.title, xmlUrl: f.feed_url, htmlUrl: f.site_url || undefined })),
    }));

    const xml = generateOPML({
      title: 'AwesomeReader Subscriptions',
      folders: opmlFolders,
      rootFeeds,
    });

    const blob = new Blob([xml], { type: 'text/x-opml+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'awesomereader-subscriptions.opml';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Inoreader OPML Import & Export</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="opml-section">
          <h4>📥 Import Subscriptions (Inoreader / Feedly OPML)</h4>
          <p className="desc">Upload your exported <code>.opml</code> or <code>.xml</code> file to import folders and feeds.</p>

          <form onSubmit={handleImportSubmit}>
            <input
              type="file"
              accept=".opml,.xml"
              onChange={handleFileChange}
              required
            />
            {selectedFile && <div className="file-info">Selected: {selectedFile.name}</div>}

            <button type="submit" className="btn-action" disabled={!selectedFile || isImporting}>
              {isImporting ? 'Importing Inoreader OPML...' : 'Start OPML Import'}
            </button>
          </form>
        </div>

        <div className="divider" />

        <div className="opml-section">
          <h4>📤 Export Subscriptions</h4>
          <p className="desc">Download your AwesomeReader subscription feeds and folder hierarchy as a standard OPML file.</p>
          <button type="button" className="btn-secondary" onClick={handleExportDownload}>
            Download OPML Backup
          </button>
        </div>
      </div>
    </div>
  );
};
