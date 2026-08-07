
import Dexie, { Table } from 'dexie';
import { Folder, Feed, Article, Book } from '@/types';

export class AwesomeReaderDB extends Dexie {
  folders!: Table<Folder, string>;
  feeds!: Table<Feed, string>;
  articles!: Table<Article, string>;
  books!: Table<Book, string>;

  constructor() {
    super('AwesomeReaderDB');
    this.version(1).stores({
      folders: 'id, name, sort_order',
      feeds: 'id, folder_id, title, feed_url, status',
      articles: 'id, feed_id, guid, published_at, is_read, is_starred, [feed_id+guid]',
    });
    // v2 adds the Books space (ADR-0001/0003): EPUB blobs + metadata + progress.
    this.version(2).stores({
      folders: 'id, name, sort_order',
      feeds: 'id, folder_id, title, feed_url, status',
      articles: 'id, feed_id, guid, published_at, is_read, is_starred, [feed_id+guid]',
      books: 'id, title, added_at',
    });
  }

  // Book Helper Methods (Books space, ADR-0001)
  async addBook(input: {
    blob: Blob;
    title: string;
    author: string | null;
    cover?: Blob | null;
  }): Promise<Book> {
    const book: Book = {
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: input.title,
      author: input.author,
      cover: input.cover ?? null,
      blob: input.blob,
      added_at: new Date().toISOString(),
      progress: null,
      location: null,
    };
    await this.books.put(book);
    return book;
  }

  /** Shelf order: most recently imported first. */
  async getBooks(): Promise<Book[]> {
    return this.books.orderBy('added_at').reverse().toArray();
  }

  async getBookBlob(id: string): Promise<Blob | null> {
    const book = await this.books.get(id);
    return book?.blob ?? null;
  }

  async deleteBook(id: string): Promise<void> {
    await this.books.delete(id);
  }

  /**
   * Duplicate detection for import: normalized (case/whitespace-insensitive)
   * title + author match. Authorless books match on title alone via '' == ''.
   */
  async findBookByTitleAuthor(title: string, author: string | null): Promise<Book | null> {
    const normalizedTitle = title.trim().toLowerCase();
    const normalizedAuthor = (author ?? '').trim().toLowerCase();
    const books = await this.books.toArray();
    return (
      books.find(
        (b) =>
          b.title.trim().toLowerCase() === normalizedTitle &&
          (b.author ?? '').trim().toLowerCase() === normalizedAuthor
      ) ?? null
    );
  }

  /** Reading progress (ticket 05): location token + 0..1 fraction. */
  async updateBookProgress(
    id: string,
    updates: { location?: string | null; progress?: number | null }
  ): Promise<Book | null> {
    const book = await this.books.get(id);
    if (!book) return null;
    const updated: Book = {
      ...book,
      location: updates.location !== undefined ? updates.location : book.location,
      progress: updates.progress !== undefined ? updates.progress : book.progress,
    };
    await this.books.put(updated);
    return updated;
  }

  async getBookProgress(id: string): Promise<{ location: string | null; progress: number | null } | null> {
    const book = await this.books.get(id);
    if (!book) return null;
    return { location: book.location, progress: book.progress };
  }

  async getFolders(): Promise<Folder[]> {
    const folderList = await this.folders.orderBy('sort_order').toArray();
    const allArticles = await this.articles.toArray();
    const allFeeds = await this.feeds.toArray();

    return folderList.map((folder) => {
      const folderFeedIds = new Set(
        allFeeds.filter((f) => f.folder_id === folder.id).map((f) => f.id)
      );
      const unreadCount = allArticles.filter(
        (a) => folderFeedIds.has(a.feed_id) && !a.is_read
      ).length;

      return { ...folder, unread_count: unreadCount };
    });
  }

  async createFolder(name: string, icon = 'folder'): Promise<Folder> {
    const count = await this.folders.count();
    const folder: Folder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      icon,
      sort_order: count,
      created_at: new Date().toISOString(),
      unread_count: 0,
    };
    await this.folders.put(folder);
    return folder;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.transaction('rw', this.folders, this.feeds, async () => {
      const folderFeeds = await this.feeds.where('folder_id').equals(folderId).toArray();
      for (const feed of folderFeeds) {
        await this.feeds.update(feed.id, { folder_id: null });
      }
      await this.folders.delete(folderId);
    });
  }

  // Feed Helper Methods
  async getFeeds(): Promise<Feed[]> {
    const feedList = await this.feeds.toArray();
    const allArticles = await this.articles.toArray();

    return feedList.map((feed) => {
      const unreadCount = allArticles.filter(
        (a) => a.feed_id === feed.id && !a.is_read
      ).length;
      return { ...feed, unread_count: unreadCount };
    });
  }

  async addFeed(feedData: Partial<Feed> & { title: string; feed_url: string }): Promise<Feed> {
    const existing = await this.feeds.where('feed_url').equals(feedData.feed_url).first();
    if (existing) return existing;

    const feed: Feed = {
      id: `feed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      folder_id: feedData.folder_id || null,
      title: feedData.title,
      feed_url: feedData.feed_url,
      site_url: feedData.site_url || null,
      icon_url: feedData.icon_url || null,
      etag: feedData.etag || null,
      last_modified: feedData.last_modified || null,
      last_fetched_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      unread_count: 0,
    };
    await this.feeds.put(feed);
    return feed;
  }

  async moveFeedToFolder(feedId: string, folderId: string | null): Promise<void> {
    await this.feeds.update(feedId, { folder_id: folderId });
  }

  async deleteFeed(feedId: string): Promise<void> {
    await this.transaction('rw', this.feeds, this.articles, async () => {
      await this.articles.where('feed_id').equals(feedId).delete();
      await this.feeds.delete(feedId);
    });
  }

  async updateFeedCrawlState(
    feedId: string,
    state: { etag?: string | null; last_modified?: string | null; last_fetched_at: string }
  ): Promise<void> {
    const updates: Partial<Feed> = { last_fetched_at: state.last_fetched_at };
    if (state.etag !== undefined) {
      updates.etag = state.etag;
    }
    if (state.last_modified !== undefined) {
      updates.last_modified = state.last_modified;
    }
    await this.feeds.update(feedId, updates);
  }

  // Article Helper Methods
  async saveArticles(
    articlesData: Array<Partial<Article> & { feed_id: string; guid: string; title: string; url: string; published_at: string; image_url?: string | null }>
  ): Promise<Article[]> {
    const saved: Article[] = [];

    for (const data of articlesData) {
      const existing = await this.articles
        .where('[feed_id+guid]')
        .equals([data.feed_id, data.guid])
        .first();

      if (existing) {
        let isModified = false;
        if (!existing.image_url && data.image_url) {
          existing.image_url = data.image_url;
          isModified = true;
        }
        if (isModified) {
          await this.articles.put(existing);
        }
        saved.push(existing);
        continue;
      }

      const article: Article = {
        id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        feed_id: data.feed_id,
        guid: data.guid,
        title: data.title,
        author: data.author || null,
        url: data.url,
        published_at: data.published_at,
        summary: data.summary || null,
        content: data.content || null,
        full_content: data.full_content || null,
        image_url: data.image_url || null,
        is_read: false,
        is_starred: false,
        created_at: new Date().toISOString(),
      };
      await this.articles.put(article);
      saved.push(article);
    }
    return saved;
  }

  async getArticles(filter: { feedId?: string; folderId?: string; unreadOnly?: boolean; starredOnly?: boolean } = {}): Promise<Article[]> {
    let list = await this.articles.toArray();

    if (filter.feedId) {
      list = list.filter((a) => a.feed_id === filter.feedId);
    } else if (filter.folderId) {
      const feeds = await this.feeds.where('folder_id').equals(filter.folderId).toArray();
      const feedIds = new Set(feeds.map((f) => f.id));
      list = list.filter((a) => feedIds.has(a.feed_id));
    }

    if (filter.unreadOnly) {
      list = list.filter((a) => !a.is_read);
    }
    if (filter.starredOnly) {
      list = list.filter((a) => a.is_starred);
    }

    return list.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }

  async updateArticleState(
    id: string,
    updates: { is_read?: boolean; is_starred?: boolean; full_content?: string; image_url?: string | null; thumbnail_fetched?: boolean }
  ): Promise<Article | null> {
    const article = await this.articles.get(id);
    if (!article) return null;

    const updated: Article = {
      ...article,
      is_read: updates.is_read !== undefined ? updates.is_read : article.is_read,
      is_starred: updates.is_starred !== undefined ? updates.is_starred : article.is_starred,
      full_content: updates.full_content !== undefined ? updates.full_content : article.full_content,
      image_url: updates.image_url !== undefined ? updates.image_url : article.image_url,
      thumbnail_fetched:
        updates.thumbnail_fetched !== undefined ? updates.thumbnail_fetched : article.thumbnail_fetched,
      read_at: updates.is_read ? new Date().toISOString() : article.read_at,
      starred_at: updates.is_starred ? new Date().toISOString() : article.starred_at,
    };

    await this.articles.put(updated);
    return updated;
  }

  async markArticlesAsRead(articleIds: string[]): Promise<void> {
    if (articleIds.length === 0) return;
    await this.transaction('rw', this.articles, async () => {
      for (const id of articleIds) {
        const article = await this.articles.get(id);
        if (article && !article.is_read) {
          article.is_read = true;
          article.read_at = new Date().toISOString();
          await this.articles.put(article);
        }
      }
    });
  }

  /**
   * Clear the cached articles from the local database. Folders, subscriptions
   * (feeds), and starred articles are kept; unstarred articles are removed so
   * new ones reappear on the next refresh. Read state resets with the cache.
   *
   * NOTE: is_read / is_starred are boolean columns. IndexedDB does not support
   * boolean keys, so Dexie silently leaves boolean columns unindexed — an
   * indexed query like where('is_starred').equals(0) matches nothing. Filter in
   * memory instead, then bulk-delete by primary key.
   */
  async clearCachedArticles(): Promise<void> {
    const unstarredIds = await this.articles.filter((a) => !a.is_starred).primaryKeys();
    if (unstarredIds.length > 0) {
      await this.articles.bulkDelete(unstarredIds);
    }
  }
}

export const clientDb = new AwesomeReaderDB();
