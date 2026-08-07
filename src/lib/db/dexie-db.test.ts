import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import { AwesomeReaderDB } from './dexie-db';

describe('clearCachedArticles', () => {
  let db: AwesomeReaderDB;

  beforeEach(async () => {
    db = new AwesomeReaderDB();
    await db.articles.clear();
    await db.feeds.clear();
    await db.folders.clear();
  });

  it('deletes unstarred articles but keeps starred ones', async () => {
    const feed = await db.addFeed({
      title: 'Test Feed',
      feed_url: 'https://example.com/feed.xml',
    });

    const saved = await db.saveArticles([
      {
        feed_id: feed.id,
        guid: 'unstarred-1',
        title: 'Unstarred 1',
        url: 'https://example.com/1',
        published_at: new Date().toISOString(),
      },
      {
        feed_id: feed.id,
        guid: 'unstarred-2',
        title: 'Unstarred 2',
        url: 'https://example.com/2',
        published_at: new Date().toISOString(),
      },
      {
        feed_id: feed.id,
        guid: 'starred-1',
        title: 'Starred 1',
        url: 'https://example.com/3',
        published_at: new Date().toISOString(),
      },
    ]);

    await db.updateArticleState(saved[2].id, { is_starred: true });

    await db.clearCachedArticles();

    const remaining = await db.getArticles();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(saved[2].id);
    expect(remaining[0].is_starred).toBe(true);
    expect(remaining[0].is_read).toBe(false);
  });

  it('leaves feeds and folders untouched', async () => {
    const folder = await db.createFolder('My Folder');
    const feed = await db.addFeed({
      title: 'Test Feed',
      feed_url: 'https://example.com/feed.xml',
      folder_id: folder.id,
    });
    await db.saveArticles([
      {
        feed_id: feed.id,
        guid: 'a',
        title: 'A',
        url: 'https://example.com/a',
        published_at: new Date().toISOString(),
      },
    ]);

    await db.clearCachedArticles();

    expect(await db.getFolders()).toHaveLength(1);
    expect(await db.getFeeds()).toHaveLength(1);
    expect(await db.getArticles()).toHaveLength(0);
  });
});
