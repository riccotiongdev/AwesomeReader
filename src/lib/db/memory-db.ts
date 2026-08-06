import { Folder, Feed, Article } from '@/types';

// In-memory / local storage fallback database for local execution & testing
class InMemoryDatabase {
  private folders: Map<string, Folder> = new Map();
  private feeds: Map<string, Feed> = new Map();
  private articles: Map<string, Article> = new Map();

  // Folder Methods
  async createFolder(name: string, icon = 'folder'): Promise<Folder> {
    const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const folder: Folder = {
      id,
      name,
      icon,
      sort_order: this.folders.size,
      created_at: new Date().toISOString(),
      unread_count: 0,
    };
    this.folders.set(id, folder);
    return folder;
  }

  async getFolders(): Promise<Folder[]> {
    const folderList = Array.from(this.folders.values());
    return folderList.map(folder => {
      const unreadCount = Array.from(this.articles.values()).filter(a => {
        const feed = this.feeds.get(a.feed_id);
        return feed && feed.folder_id === folder.id && !a.is_read;
      }).length;
      return { ...folder, unread_count: unreadCount };
    });
  }

  // Feed Methods
  async addFeed(feedData: Partial<Feed> & { title: string; feed_url: string }): Promise<Feed> {
    const existing = Array.from(this.feeds.values()).find(f => f.feed_url === feedData.feed_url);
    if (existing) return existing;

    const id = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const feed: Feed = {
      id,
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
    this.feeds.set(id, feed);
    return feed;
  }

  async getFeeds(): Promise<Feed[]> {
    return Array.from(this.feeds.values()).map(feed => {
      const unreadCount = Array.from(this.articles.values()).filter(
        a => a.feed_id === feed.id && !a.is_read
      ).length;
      return { ...feed, unread_count: unreadCount };
    });
  }

  // Article Methods
  async saveArticles(articlesData: Array<Partial<Article> & { feed_id: string; guid: string; title: string; url: string; published_at: string }>): Promise<Article[]> {
    const saved: Article[] = [];
    for (const data of articlesData) {
      const articleKey = `${data.feed_id}:${data.guid}`;
      const existing = this.articles.get(articleKey);

      if (existing) {
        saved.push(existing);
        continue;
      }

      const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const article: Article = {
        id,
        feed_id: data.feed_id,
        guid: data.guid,
        title: data.title,
        author: data.author || null,
        url: data.url,
        published_at: data.published_at,
        summary: data.summary || null,
        content: data.content || null,
        full_content: data.full_content || null,
        is_read: false,
        is_starred: false,
        created_at: new Date().toISOString(),
      };
      this.articles.set(articleKey, article);
      saved.push(article);
    }
    return saved;
  }

  async getArticles(filter: { feedId?: string; folderId?: string; unreadOnly?: boolean; starredOnly?: boolean } = {}): Promise<Article[]> {
    let list = Array.from(this.articles.values());

    if (filter.feedId) {
      list = list.filter(a => a.feed_id === filter.feedId);
    } else if (filter.folderId) {
      const feedIdsInFolder = new Set(
        Array.from(this.feeds.values()).filter(f => f.folder_id === filter.folderId).map(f => f.id)
      );
      list = list.filter(a => feedIdsInFolder.has(a.feed_id));
    }

    if (filter.unreadOnly) {
      list = list.filter(a => !a.is_read);
    }
    if (filter.starredOnly) {
      list = list.filter(a => a.is_starred);
    }

    return list.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }

  async updateArticleState(id: string, updates: { is_read?: boolean; is_starred?: boolean; full_content?: string; image_url?: string | null; thumbnail_fetched?: boolean }): Promise<Article | null> {
    for (const [key, article] of this.articles.entries()) {
      if (article.id === id) {
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
        this.articles.set(key, updated);
        return updated;
      }
    }
    return null;
  }
}

export const db = new InMemoryDatabase();
