import { Readability } from '@mozilla/readability';
import { sanitizeArticleHtml } from './sanitizer';
import { clientFetchText } from '../network/http-client';

export interface ExtractedArticle {
  title?: string;
  byline?: string;
  content: string;
  textContent?: string;
  excerpt?: string;
  lead_image_url?: string;
}

export async function extractFullArticle(articleUrl: string): Promise<ExtractedArticle> {
  const html = await clientFetchText(articleUrl);
  
  // Parse HTML string into DOM Document using browser DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract meta og:image or twitter:image
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                  doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
                  doc.querySelector('link[rel="image_src"]')?.getAttribute('href');

  let leadImageUrl: string | undefined = undefined;
  if (ogImage) {
    try {
      leadImageUrl = new URL(ogImage, articleUrl).href;
    } catch (e) {
      leadImageUrl = ogImage;
    }
  }

  const reader = new Readability(doc);
  const article = reader.parse();

  let rawContent = article?.content || '';

  // JSON-LD structured data fallback (extracts articleBody if embedded in schema.org JSON)
  const ldJsonScripts = doc.querySelectorAll('script[type="application/ld+json"]');
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

  // Fallback: If Readability and JSON-LD fail to locate article container, fallback to main content tags or body
  if (!rawContent || rawContent.trim().length === 0) {
    const mainEl = doc.querySelector('article, main, .entry-content, .post-content, .article-content, #content') || doc.body;
    rawContent = mainEl ? mainEl.innerHTML : html;
  }

  const cleanContent = sanitizeArticleHtml(rawContent, { baseUrl: articleUrl });

  return {
    title: article?.title || doc.title || undefined,
    byline: article?.byline || undefined,
    content: cleanContent,
    textContent: article?.textContent || undefined,
    excerpt: article?.excerpt || undefined,
    lead_image_url: leadImageUrl,
  };
}
