import { Feed, FeedFetchResult } from '@/types';

export interface FeedSelection {
  selectedFeedId: string | null;
  selectedFolderId: string | null;
}

export function resolveFeedScope(feeds: Feed[], selection: FeedSelection): Feed[] {
  if (selection.selectedFeedId) {
    const feed = feeds.find((f) => f.id === selection.selectedFeedId);
    return feed ? [feed] : [];
  }

  if (selection.selectedFolderId) {
    return feeds.filter((f) => f.folder_id === selection.selectedFolderId);
  }

  return feeds;
}

export interface RefreshableArticle {
  feed_id: string;
  guid: string;
  title: string;
  url: string;
  published_at: string;
  author?: string;
  summary?: string;
  content?: string;
  image_url?: string | null;
}

export interface RefreshDeps {
  fetchFeed: (
    feedUrl: string,
    options?: { etag?: string; lastModified?: string }
  ) => Promise<{ notModified: boolean; result?: FeedFetchResult }>;
  saveArticles: (articles: RefreshableArticle[]) => Promise<unknown>;
  updateFeedCrawlState: (
    feedId: string,
    state: { etag?: string | null; last_modified?: string | null; last_fetched_at: string }
  ) => Promise<void>;
  now?: () => string;
}

export interface FeedRefreshOutcome {
  feedId: string;
  status: 'updated' | 'not_modified' | 'error';
  error?: string;
}

export async function refreshFeedsForView(
  feeds: Feed[],
  selection: FeedSelection,
  deps: RefreshDeps
): Promise<FeedRefreshOutcome[]> {
  const inScope = resolveFeedScope(feeds, selection);
  const outcomes: FeedRefreshOutcome[] = [];

  for (const feed of inScope) {
    try {
      const crawl = await deps.fetchFeed(feed.feed_url, {
        etag: feed.etag || undefined,
        lastModified: feed.last_modified || undefined,
      });
      const fetchedAt = deps.now ? deps.now() : new Date().toISOString();

      if (crawl.notModified) {
        await deps.updateFeedCrawlState(feed.id, { last_fetched_at: fetchedAt });
        outcomes.push({ feedId: feed.id, status: 'not_modified' });
        continue;
      }

      if (crawl.result) {
        await deps.saveArticles(
          crawl.result.articles.map((art) => ({
            feed_id: feed.id,
            guid: art.guid,
            title: art.title,
            url: art.url,
            published_at: art.publishedAt,
            author: art.author,
            summary: art.summary,
            content: art.content,
            image_url: art.image_url,
          }))
        );
        await deps.updateFeedCrawlState(feed.id, {
          etag: crawl.result.etag || null,
          last_modified: crawl.result.lastModified || null,
          last_fetched_at: fetchedAt,
        });
        outcomes.push({ feedId: feed.id, status: 'updated' });
      }
    } catch (err: any) {
      outcomes.push({ feedId: feed.id, status: 'error', error: err?.message || String(err) });
    }
  }

  return outcomes;
}
