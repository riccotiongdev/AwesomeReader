import { clientFetchText } from '../network/http-client';

export interface DiscoveredFeed {
  title: string;
  feedUrl: string;
  siteUrl: string;
  subscribers?: number;
  description?: string;
  iconUrl?: string;
}

export const POPULAR_TOPIC_SUGGESTIONS = [
  { id: 'tech', name: 'Technology & AI', query: 'technology ai', icon: '💻' },
  { id: 'news', name: 'World & Breaking News', query: 'world news', icon: '🌍' },
  { id: 'automotive', name: 'Automotive & EVs', query: 'automotive car news', icon: '🚗' },
  { id: 'finance', name: 'Finance & Crypto', query: 'finance crypto markets', icon: '📈' },
  { id: 'gaming', name: 'Gaming & Esports', query: 'video games esports', icon: '🎮' },
  { id: 'design', name: 'Design & UX', query: 'web design ux ui', icon: '🎨' },
  { id: 'science', name: 'Science & Space', query: 'science astronomy space', icon: '🔬' },
  { id: 'food', name: 'Food & Cooking', query: 'food recipes cooking', icon: '🍔' },
  { id: 'sports', name: 'Sports & Football', query: 'sports premier league', icon: '⚽' },
  { id: 'entertainment', name: 'Movies & Culture', query: 'movies pop culture', icon: '🍿' },
];

/**
 * Universal Feed Search Engine
 * Robust multi-strategy search with timeout guards to prevent UI hanging.
 */
export async function searchInternetFeeds(query: string): Promise<DiscoveredFeed[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Strategy 1: If query is direct URL or domain
  if (/^https?:\/\//i.test(cleanQuery) || /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(cleanQuery)) {
    try {
      const directResults = await resolveDirectUrlFeed(cleanQuery);
      if (directResults.length > 0) return directResults;
    } catch (e) {
      console.warn('Direct URL resolution note:', e);
    }
  }

  const results: DiscoveredFeed[] = [];

  // Strategy 2: Feedly Open Search Index (with 3.5s timeout controller)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const searchUrl = `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(cleanQuery)}&count=30`;
    const res = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          const feedUrl = item.feedId ? item.feedId.replace(/^feed\//, '') : '';
          if (feedUrl) {
            results.push({
              title: item.title || 'Untitled RSS Feed',
              feedUrl: feedUrl,
              siteUrl: item.website || feedUrl,
              subscribers: item.subscribers || 0,
              description: item.description || '',
              iconUrl: item.visualUrl || item.iconUrl || undefined,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Feedly primary search timed out or threw, switching to fallback index:', err);
  }

  // Strategy 3: Backup iTunes/Podcast RSS Search Index if Feedly yields 0 results
  if (results.length === 0) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=podcast&limit=15`;
      const res = await fetch(itunesUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            if (item.feedUrl) {
              results.push({
                title: item.collectionName || item.trackName || 'Podcast Feed',
                feedUrl: item.feedUrl,
                siteUrl: item.collectionViewUrl || item.feedUrl,
                description: item.primaryGenreName ? `Category: ${item.primaryGenreName}` : 'Podcast RSS Feed',
                iconUrl: item.artworkUrl100 || item.artworkUrl60 || undefined,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('iTunes fallback search note:', e);
    }
  }

  // Strategy 4: Google News RSS Search Generator fallback if still empty
  if (results.length === 0) {
    const googleNewsFeedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-SG&gl=SG&ceid=SG:en`;
    results.push({
      title: `Google News: "${cleanQuery}"`,
      feedUrl: googleNewsFeedUrl,
      siteUrl: `https://news.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
      description: `Live Google News RSS feed tracking latest updates for "${cleanQuery}".`,
    });
  }

  return results;
}

/**
 * Resolve direct URL or domain to valid RSS feed
 */
async function resolveDirectUrlFeed(rawInput: string): Promise<DiscoveredFeed[]> {
  const url = rawInput.startsWith('http') ? rawInput : `https://${rawInput}`;

  try {
    const html = await clientFetchText(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Look for <link rel="alternate" type="application/rss+xml">
    const rssLink = doc.querySelector('link[type="application/rss+xml"], link[type="application/atom+xml"]');
    if (rssLink) {
      const href = rssLink.getAttribute('href');
      if (href) {
        const fullFeedUrl = new URL(href, url).href;
        const pageTitle = doc.querySelector('title')?.textContent || url;

        return [
          {
            title: pageTitle.trim(),
            feedUrl: fullFeedUrl,
            siteUrl: url,
            subscribers: 100,
            description: `Auto-discovered RSS feed from ${url}`,
          },
        ];
      }
    }

    // Direct RSS URL fallback
    if (/(\/feed|\/rss|\.xml|\.rss|\/atom)/i.test(url)) {
      return [
        {
          title: url,
          feedUrl: url,
          siteUrl: url,
          description: 'Direct RSS feed URL',
        },
      ];
    }
  } catch (e) {
    // ignore fetch error
  }

  return [];
}
