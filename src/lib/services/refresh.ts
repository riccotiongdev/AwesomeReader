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

export interface RefreshOptions {
  /** Max number of feeds crawled at once. Higher = faster but hammers servers. */
  concurrency?: number;
  /**
   * Invoked as soon as a single feed finishes crawling, in completion order
   * (not the order of the input list). Lets the UI show each feed's articles
   * the moment they are saved instead of waiting for the whole refresh.
   */
  onFeedComplete?: (outcome: FeedRefreshOutcome) => void | Promise<void>;
}

export const DEFAULT_REFRESH_CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function refreshFeed(
  feed: Feed,
  deps: RefreshDeps,
  fetchedAt: string
): Promise<FeedRefreshOutcome> {
  try {
    const crawl = await deps.fetchFeed(feed.feed_url, {
      etag: feed.etag || undefined,
      lastModified: feed.last_modified || undefined,
    });

    if (crawl.notModified) {
      await deps.updateFeedCrawlState(feed.id, { last_fetched_at: fetchedAt });
      return { feedId: feed.id, status: 'not_modified' };
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
      return { feedId: feed.id, status: 'updated' };
    }

    return { feedId: feed.id, status: 'error', error: 'Empty feed result' };
  } catch (err: any) {
    return { feedId: feed.id, status: 'error', error: err?.message || String(err) };
  }
}

export async function refreshFeedsForView(
  feeds: Feed[],
  selection: FeedSelection,
  deps: RefreshDeps,
  options: RefreshOptions = {}
): Promise<FeedRefreshOutcome[]> {
  const inScope = resolveFeedScope(feeds, selection);
  const fetchedAt = deps.now ? deps.now() : new Date().toISOString();
  const concurrency = options.concurrency ?? DEFAULT_REFRESH_CONCURRENCY;

  // Crawl feeds in parallel (bounded), but keep outcome order aligned with the feed list.
  // Each feed's onFeedComplete notification is delivered as soon as that feed finishes,
  // so callers can stream results into the UI without waiting for the full refresh.
  return mapWithConcurrency(inScope, concurrency, async (feed) => {
    const outcome = await refreshFeed(feed, deps, fetchedAt);
    if (options.onFeedComplete) {
      await options.onFeedComplete(outcome);
    }
    return outcome;
  });
}
