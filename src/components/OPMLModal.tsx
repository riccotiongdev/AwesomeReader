'use client';

import React, { useState } from 'react';
import { generateOPML } from '@/lib/services/opml';
import { clientDb } from '@/lib/db/dexie-db';

interface OPMLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportOpml: (file: File) => Promise<void>;
  isImporting: boolean;
  onNotify?: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export const OPMLModal: React.FC<OPMLModalProps> = ({
  isOpen,
  onClose,
  onImportOpml,
  isImporting,
  onNotify,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

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

  const getOpmlXmlString = async () => {
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

    return generateOPML({
      title: 'AwesomeReader Subscriptions',
      folders: opmlFolders,
      rootFeeds,
    });
  };

  const handleExportDownload = async () => {
    try {
      const xml = await getOpmlXmlString();
      const fileName = 'awesomereader-subscriptions.opml';

      const blob = new Blob([xml], { type: 'text/x-opml+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      if (onNotify) onNotify(`Export failed: ${err?.message || err}`, 'error');
      else console.warn('Export failed:', err);
    }
  };

  const handleCopyOpmlXml = async () => {
    try {
      const xml = await getOpmlXmlString();
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err: any) {
      if (onNotify) onNotify('Failed to copy OPML XML: ' + err?.message, 'error');
      else console.warn('Failed to copy OPML XML:', err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>OPML Import & Export</h3>
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
              {isImporting ? 'Importing OPML...' : 'Start OPML Import'}
            </button>
          </form>
        </div>

        <div className="divider" />

        <div className="opml-section">
          <h4>📤 Export Subscriptions Backup</h4>
          <p className="desc">Download your AwesomeReader subscription feeds and folder hierarchy as an OPML file or copy the raw XML backup.</p>
          
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-action" onClick={handleExportDownload} style={{ flex: 1 }}>
              💾 Download OPML File
            </button>
            <button type="button" className="btn-secondary" onClick={handleCopyOpmlXml} style={{ minWidth: '140px' }}>
              {copied ? '✓ Copied!' : '📋 Copy OPML XML'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
