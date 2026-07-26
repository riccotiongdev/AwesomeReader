import { clientFetchText } from '../network/http-client';
import { clientDb } from '../db/dexie-db';
import { Article } from '@/types';

const inFlightEnrichments = new Set<string>();

/**
 * Asynchronously enriches articles missing image_url by fetching og:image from the article's web page.
 * Stores the discovered image_url in IndexedDB for permanent local caching.
 */
export async function fetchOgImageForArticle(article: Article): Promise<string | null> {
  if (article.image_url) return article.image_url;
  if (inFlightEnrichments.has(article.id)) return null;

  inFlightEnrichments.add(article.id);

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
  } catch (err) {
    console.warn(`Thumbnail enrichment note for ${article.title}:`, err);
  } finally {
    inFlightEnrichments.delete(article.id);
  }

  return null;
}
