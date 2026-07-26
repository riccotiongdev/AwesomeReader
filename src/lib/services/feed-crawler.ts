import { XMLParser } from 'fast-xml-parser';
import { FeedFetchResult } from '@/types';
import { sanitizeArticleHtml } from './sanitizer';
import { clientFetchText } from '../network/http-client';

export interface FetchFeedOptions {
  etag?: string;
  lastModified?: string;
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return url;
  }
}

function extractHeroImageUrl(item: any, rawContent: string, summary: string, baseUrl: string): string | null {
  // 1. Check media:content or media:thumbnail
  const mediaContent = item['media:content'] || item['media:thumbnail'];
  if (mediaContent) {
    const url = Array.isArray(mediaContent)
      ? mediaContent[0]?.['@_url'] || mediaContent[0]?.url
      : mediaContent['@_url'] || mediaContent.url;
    if (typeof url === 'string' && url.length > 5) {
      return resolveUrl(url, baseUrl);
    }
  }

  // 2. Check enclosure
  if (item.enclosure) {
    const encUrl = item.enclosure['@_url'] || item.enclosure.url;
    const encType = item.enclosure['@_type'] || item.enclosure.type || '';
    if (typeof encUrl === 'string' && (encType.startsWith('image') || encUrl.match(/\.(jpg|jpeg|png|webp|gif)/i))) {
      return resolveUrl(encUrl, baseUrl);
    }
  }

  // 3. Extract first <img> tag from raw HTML content or summary
  const htmlToSearch = `${rawContent} ${summary}`;
  const imgMatch = htmlToSearch.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    const src = imgMatch[1];
    if (!src.includes('tracker') && !src.includes('pixel') && !src.includes('1x1')) {
      return resolveUrl(src, baseUrl);
    }
  }

  return null;
}

export async function fetchAndParseFeed(
  feedUrl: string,
  options: FetchFeedOptions = {}
): Promise<{ notModified: boolean; result?: FeedFetchResult }> {
  const headers: Record<string, string> = {
    'Accept': 'application/rss+xml, application/atom+xml, application/json, text/xml, */*'
  };

  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }
  if (options.lastModified) {
    headers['If-Modified-Since'] = options.lastModified;
  }

  const rawXml = await clientFetchText(feedUrl, { headers });

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: false,
    htmlEntities: true,
  });

  const parsed = xmlParser.parse(rawXml);

  // RSS 2.0 vs Atom
  const channel = parsed.rss?.channel || parsed.feed || parsed;
  const rawTitle = channel?.title?.['#text'] || channel?.title || 'Untitled Feed';
  let siteUrl = channel?.link?.['@_href'] || channel?.link || new URL(feedUrl).origin;
  if (typeof siteUrl !== 'string') {
    siteUrl = new URL(feedUrl).origin;
  }

  const rawItems = channel?.item || channel?.entry || [];
  const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];

  const articles = itemsArray.filter(Boolean).map((item: any) => {
    const guid = item.guid?.['#text'] || item.guid || item.id || item.link?.['@_href'] || item.link || item.title || `${Date.now()}-${Math.random()}`;
    const title = item.title?.['#text'] || item.title || 'Untitled Article';
    const author = item.author?.name || item['dc:creator'] || item.author || undefined;
    
    let url = item.link?.['@_href'] || item.link;
    if (typeof url !== 'string') {
      url = siteUrl;
    }

    const pubDate = item.pubDate || item.published || item.updated || item['dc:date'] || new Date().toISOString();
    const rawContent = item['content:encoded'] || item.content?.['#text'] || item.content || item.description || item.summary || '';
    const summary = item.description || item.summary?.['#text'] || item.summary || '';
    const imageUrl = extractHeroImageUrl(item, String(rawContent), String(summary), siteUrl);

    return {
      guid: String(guid),
      title: String(title).trim(),
      author: typeof author === 'string' ? author : undefined,
      url: String(url),
      publishedAt: String(pubDate),
      image_url: imageUrl,
      summary: sanitizeArticleHtml(String(summary), { baseUrl: siteUrl }),
      content: sanitizeArticleHtml(String(rawContent), { baseUrl: siteUrl }),
    };
  });

  return {
    notModified: false,
    result: {
      feedTitle: String(rawTitle).trim(),
      siteUrl: String(siteUrl),
      articles,
    },
  };
}
