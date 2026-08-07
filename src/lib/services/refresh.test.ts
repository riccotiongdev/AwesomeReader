import { describe, expect, it, vi } from 'vitest';
import { Feed } from '@/types';
import {
  resolveFeedScope,
  refreshFeedsForView,
  RefreshDeps,
  FeedRefreshOutcome,
} from '@/lib/services/refresh';
const makeFeed = (id: string, folderId: string | null = null): Feed => ({
  id,
  folder_id: folderId,
  title: `Feed ${id}`,
  feed_url: `https://example.com/${id}.xml`,
  site_url: `https://example.com/${id}`,
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
});

const feeds = [
  makeFeed('f1'),
  makeFeed('f2', 'folderA'),
  makeFeed('f3', 'folderA'),
  makeFeed('f4', 'folderB'),
];

describe('resolveFeedScope', () => {
  it('returns all feeds when no feed or folder is selected', () => {
    expect(resolveFeedScope(feeds, { selectedFeedId: null, selectedFolderId: null })).toHaveLength(4);
  });

  it('returns only the selected feed when a feed is selected', () => {
    expect(resolveFeedScope(feeds, { selectedFeedId: 'f3', selectedFolderId: null })).toEqual([feeds[2]]);
  });

  it('returns all feeds in the selected folder', () => {
    expect(resolveFeedScope(feeds, { selectedFeedId: null, selectedFolderId: 'folderA' })).toEqual([feeds[1], feeds[2]]);
  });

  it('gives the selected feed precedence over a selected folder', () => {
    expect(resolveFeedScope(feeds, { selectedFeedId: 'f1', selectedFolderId: 'folderA' })).toEqual([feeds[0]]);
  });

  it('returns an empty list when the selected feed is unknown', () => {
    expect(resolveFeedScope(feeds, { selectedFeedId: 'nope', selectedFolderId: null })).toEqual([]);
  });

  it('returns an empty list when the selected folder has no feeds', () => {
    expect(resolveFeedScope(feeds, { selectedFeedId: null, selectedFolderId: 'empty' })).toEqual([]);
  });
});

const makeDeps = (overrides: Partial<RefreshDeps> = {}): RefreshDeps => ({
  fetchFeed: vi.fn(async () => ({
    notModified: false,
    result: {
      feedTitle: 'Feed',
      articles: [
        {
          guid: 'g1',
          title: 'Article 1',
          url: 'https://example.com/a1',
          publishedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    },
  })),
  saveArticles: vi.fn(async () => {}),
  updateFeedCrawlState: vi.fn(async () => {}),
  now: () => '2026-02-01T00:00:00.000Z',
  ...overrides,
});

const resultOf = (deps: RefreshDeps) => {
  const fetchFeed = deps.fetchFeed as ReturnType<typeof vi.fn>;
  const saveArticles = deps.saveArticles as ReturnType<typeof vi.fn>;
  const updateFeedCrawlState = deps.updateFeedCrawlState as ReturnType<typeof vi.fn>;
  return { fetchFeed, saveArticles, updateFeedCrawlState };
};

describe('refreshFeedsForView', () => {
  it('crawls only the feeds in the current view scope', async () => {
    const deps = makeDeps();
    const { fetchFeed } = resultOf(deps);

    await refreshFeedsForView(feeds, { selectedFeedId: null, selectedFolderId: 'folderA' }, deps);

    expect(fetchFeed.mock.calls.map((c) => c[0])).toEqual([
      'https://example.com/f2.xml',
      'https://example.com/f3.xml',
    ]);
  });

  it('sends the feed etag and last_modified as conditional request headers', async () => {
    const feedWithState = { ...feeds[0], etag: '"abc123"', last_modified: 'Mon, 05 Jan 2026 10:00:00 GMT' };
    const deps = makeDeps();
    const { fetchFeed } = resultOf(deps);

    await refreshFeedsForView([feedWithState], { selectedFeedId: 'f1', selectedFolderId: null }, deps);

    expect(fetchFeed).toHaveBeenCalledWith('https://example.com/f1.xml', {
      etag: '"abc123"',
      lastModified: 'Mon, 05 Jan 2026 10:00:00 GMT',
    });
  });

  it('saves crawled articles with feed_id and published_at, and persists etag/last_modified/last_fetched_at', async () => {
    const deps = makeDeps({
      fetchFeed: vi.fn(async () => ({
        notModified: false,
        result: {
          feedTitle: 'Feed',
          etag: '"v2"',
          lastModified: 'Tue, 06 Jan 2026 10:00:00 GMT',
          articles: [
            {
              guid: 'g1',
              title: 'Article 1',
              url: 'https://example.com/a1',
              publishedAt: '2026-01-02T00:00:00.000Z',
              summary: '<p>sum</p>',
            },
          ],
        },
      })),
    });
    const { saveArticles, updateFeedCrawlState } = resultOf(deps);

    await refreshFeedsForView([feeds[0]], { selectedFeedId: 'f1', selectedFolderId: null }, deps);

    expect(saveArticles).toHaveBeenCalledWith([
      {
        feed_id: 'f1',
        guid: 'g1',
        title: 'Article 1',
        url: 'https://example.com/a1',
        published_at: '2026-01-02T00:00:00.000Z',
        summary: '<p>sum</p>',
      },
    ]);
    expect(updateFeedCrawlState).toHaveBeenCalledWith('f1', {
      etag: '"v2"',
      last_modified: 'Tue, 06 Jan 2026 10:00:00 GMT',
      last_fetched_at: '2026-02-01T00:00:00.000Z',
    });
  });

  it('skips saving articles on a 304 and only stamps last_fetched_at', async () => {
    const deps = makeDeps({
      fetchFeed: vi.fn(async () => ({ notModified: true })),
    });
    const { saveArticles, updateFeedCrawlState } = resultOf(deps);

    await refreshFeedsForView([feeds[0]], { selectedFeedId: 'f1', selectedFolderId: null }, deps);

    expect(saveArticles).not.toHaveBeenCalled();
    expect(updateFeedCrawlState).toHaveBeenCalledWith('f1', {
      last_fetched_at: '2026-02-01T00:00:00.000Z',
    });
  });

  it('isolates per-feed failures and continues with the remaining feeds', async () => {
    const deps = makeDeps({
      fetchFeed: vi.fn(async (url: string) => {
        if (url.includes('f2')) throw new Error('boom');
        return {
          notModified: false,
          result: { feedTitle: 'Feed', articles: [] },
        };
      }),
    });
    const { saveArticles } = resultOf(deps);

    const outcomes = await refreshFeedsForView(
      [feeds[1], feeds[2]],
      { selectedFeedId: null, selectedFolderId: 'folderA' },
      deps
    );

    expect(outcomes).toEqual([
      { feedId: 'f2', status: 'error', error: 'boom' },
      { feedId: 'f3', status: 'updated' },
    ]);
    expect(saveArticles).toHaveBeenCalledTimes(1);
  });

  it('returns an updated outcome for successfully crawled feeds', async () => {
    const deps = makeDeps();
    const outcomes = await refreshFeedsForView(
      [feeds[0]],
      { selectedFeedId: 'f1', selectedFolderId: null },
      deps
    );
    expect(outcomes).toEqual([{ feedId: 'f1', status: 'updated' }]);
  });

  it('crawls feeds concurrently without exceeding the configured limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchFeed = vi.fn(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 15));
      inFlight--;
      return { notModified: false, result: { feedTitle: 'F', articles: [] } };
    });
    const deps = makeDeps({ fetchFeed });

    await refreshFeedsForView(feeds, { selectedFeedId: null, selectedFolderId: null }, deps, {
      concurrency: 2,
    });

    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(fetchFeed).toHaveBeenCalledTimes(4);
  });

  it('preserves outcome order matching the feed list despite parallel completion', async () => {
    const fetchFeed = vi.fn(async (url: string) => {
      await new Promise((r) => setTimeout(r, url.includes('f3') ? 40 : 5));
      return { notModified: false, result: { feedTitle: 'F', articles: [] } };
    });
    const deps = makeDeps({ fetchFeed });

    const outcomes = await refreshFeedsForView(
      [feeds[1], feeds[2], feeds[3]],
      { selectedFeedId: null, selectedFolderId: null },
      deps,
      { concurrency: 3 }
    );

    expect(outcomes.map((o) => o.feedId)).toEqual(['f2', 'f3', 'f4']);
  });
});

describe('refreshFeedsForView onFeedComplete callback', () => {
  it('reports each feed outcome as soon as that feed finishes, in completion order', async () => {
    const completed: FeedRefreshOutcome[] = [];
    const fetchFeed = vi.fn(async (url: string) => {
      // f3 crawls much slower than f2, so f2 must be reported first
      await new Promise((r) => setTimeout(r, url.includes('f3') ? 40 : 5));
      return { notModified: false, result: { feedTitle: 'F', articles: [] } };
    });
    const deps = makeDeps({ fetchFeed });

    await refreshFeedsForView(
      [feeds[1], feeds[2]],
      { selectedFeedId: null, selectedFolderId: null },
      deps,
      {
        concurrency: 2,
        onFeedComplete: (outcome) => {
          completed.push(outcome);
        },
      }
    );

    expect(completed).toHaveLength(2);
    expect(completed.map((o) => o.feedId)).toEqual(['f2', 'f3']);
  });

  it('awaits the callback so the refresh promise resolves only after all notifications', async () => {
    let notified = false;
    const deps = makeDeps();

    await refreshFeedsForView([feeds[0]], { selectedFeedId: 'f1', selectedFolderId: null }, deps, {
      onFeedComplete: async () => {
        await new Promise((r) => setTimeout(r, 20));
        notified = true;
      },
    });

    expect(notified).toBe(true);
  });

  it('fires for every outcome, including not_modified and error', async () => {
    const completed: FeedRefreshOutcome[] = [];
    const deps = makeDeps({
      fetchFeed: vi.fn(async (url: string) => {
        if (url.includes('f2')) throw new Error('boom');
        return { notModified: true };
      }),
    });

    await refreshFeedsForView(
      [feeds[1], feeds[2]],
      { selectedFeedId: null, selectedFolderId: 'folderA' },
      deps,
      { onFeedComplete: (o) => { completed.push(o); } }
    );

    expect(completed.map((o) => o.feedId)).toEqual(['f2', 'f3']);
    expect(completed.map((o) => o.status).sort()).toEqual(['error', 'not_modified']);
  });
});
