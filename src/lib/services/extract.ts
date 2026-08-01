import { Readability } from '@mozilla/readability';
import { sanitizeArticleHtml } from './sanitizer';

export interface ExtractedArticle {
  title?: string;
  byline?: string;
  content: string;
  textContent?: string;
  excerpt?: string;
  lead_image_url?: string;
}

/**
 * Build a DOM Document from an HTML string without blocking the caller.
 * - In browser contexts (main thread) the native DOMParser is used.
 * - In Web Workers and Node (tests/scripts) the lightweight linkedom parser is
 *   dynamically loaded so heavy parsing can run off the main thread.
 */
export async function createDocument(html: string): Promise<Document> {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(html, 'text/html');
  }
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML(html);
  return document as unknown as Document;
}

/**
 * Pure extraction of article metadata + clean full-text HTML from an already
 * parsed DOM document. Safe to run inside a Web Worker or test runner.
 */
export function extractFromDocument(doc: Document, baseUrl: string): ExtractedArticle {
  const ogImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
    doc.querySelector('link[rel="image_src"]')?.getAttribute('href');

  let leadImageUrl: string | undefined = undefined;
  if (ogImage) {
    try {
      leadImageUrl = new URL(ogImage, baseUrl).href;
    } catch (e) {
      leadImageUrl = ogImage;
    }
  }

  // Capture JSON-LD scripts before Readability parse, which removes them from the DOM.
  const ldJsonScripts = doc.querySelectorAll('script[type="application/ld+json"]');

  const reader = new Readability(doc);
  const article = reader.parse();

  let rawContent = article?.content || '';

  ldJsonScripts.forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || '{}');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const body = item.articleBody || item.description;
        if (body && typeof body === 'string' && body.length > rawContent.length) {
          rawContent = body.split('\n\n').map((p: string) => `<p>${p.trim()}</p>`).join('');
        }
      }
    } catch (e) {
      // ignore invalid JSON blocks
    }
  });

  if (!rawContent || rawContent.trim().length === 0) {
    const mainEl =
      doc.querySelector('article, main, .entry-content, .post-content, .article-content, #content') ||
      doc.body;
    rawContent = mainEl ? mainEl.innerHTML : doc.body?.innerHTML || '';
  }

  const cleanContent = sanitizeArticleHtml(rawContent, { baseUrl });

  return {
    title: article?.title || doc.title || undefined,
    byline: article?.byline || undefined,
    content: cleanContent,
    textContent: article?.textContent || undefined,
    excerpt: article?.excerpt || undefined,
    lead_image_url: leadImageUrl,
  };
}

/**
 * Parse + extract in the current context (no worker). Used as the fallback
 * where Web Workers are unavailable (Node scripts, tests).
 */
export async function parseArticleHtml(html: string, baseUrl: string): Promise<ExtractedArticle> {
  const doc = await createDocument(html);
  return extractFromDocument(doc, baseUrl);
}
