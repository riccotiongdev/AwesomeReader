import { clientFetchText } from '../network/http-client';
import { clientDb } from '../db/dexie-db';
import { Article } from '@/types';

const inFlightEnrichments = new Set<string>();
const queuedEnrichments: Array<{ article: Article; resolve: (url: string | null) => void }> = [];

const MAX_CONCURRENT = 5;
let activeCount = 0;

/**
 * Asynchronously enriches articles missing image_url by fetching og:image from the article's web page.
 * Stores the discovered image_url in IndexedDB for permanent local caching.
 *
 * Requests are serialized through a bounded queue so that rendering a large list never floods
 * the network or main thread. Failed/discovered-URL-less lookups are flagged with
 * `thumbnail_fetched` so they are never refetched on re-mount or re-scroll.
 */
export async function fetchOgImageForArticle(article: Article): Promise<string | null> {
  if (article.image_url) return article.image_url;
  if (article.thumbnail_fetched) return null;
  if (inFlightEnrichments.has(article.id)) return null;

  if (activeCount >= MAX_CONCURRENT) {
    return new Promise<string | null>((resolve) => {
      queuedEnrichments.push({ article, resolve });
    });
  }

  return runEnrichment(article);
}

function runEnrichment(article: Article): Promise<string | null> {
  activeCount++;
  inFlightEnrichments.add(article.id);

  const task = (async (): Promise<string | null> => {
    try {
      const html = await clientFetchText(article.url);
      const ogMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

      if (ogMatch && ogMatch[1]) {
        let imageUrl = ogMatch[1].trim();
        try {
          imageUrl = new URL(imageUrl, article.url).href;
        } catch (e) {
          // Keep raw url if parsing fails
        }

        if (imageUrl && !imageUrl.includes('tracker') && !imageUrl.includes('pixel')) {
          // Save to IndexedDB
          await clientDb.updateArticleState(article.id, { image_url: imageUrl });
          return imageUrl;
        }
      }

      // No usable image found — mark so we never fetch this URL again.
      await clientDb.updateArticleState(article.id, { thumbnail_fetched: true });
    } catch (err) {
      console.warn(`Thumbnail enrichment note for ${article.title}:`, err);
      await clientDb.updateArticleState(article.id, { thumbnail_fetched: true }).catch(() => {});
    } finally {
      inFlightEnrichments.delete(article.id);
      activeCount = Math.max(0, activeCount - 1);
      dequeueNext();
    }

    return null;
  })();

  return task;
}

function dequeueNext(): void {
  while (activeCount < MAX_CONCURRENT && queuedEnrichments.length > 0) {
    const next = queuedEnrichments.shift();
    if (!next) break;
    runEnrichment(next.article).then(next.resolve);
  }
}