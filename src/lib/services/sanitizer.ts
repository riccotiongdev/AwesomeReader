import sanitizeHtml from 'sanitize-html';

export interface SanitizeOptions {
  baseUrl?: string;
}

/**
 * Clean HTML content to prevent XSS attacks while preserving article formatting,
 * media embeds, and fixing relative links/images.
 */
export function sanitizeArticleHtml(html: string, options: SanitizeOptions = {}): string {
  if (!html) return '';

  const clean = sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'b', 'strong', 'i', 'em', 'u',
      'strike', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'hr', 'br', 'img',
      'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
      '*': ['class'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });

  if (!options.baseUrl) return clean;

  try {
    const base = new URL(options.baseUrl);

    return clean.replace(/(href|src)=["']([^"']+)["']/gi, (match, attr, url) => {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return match;
      }
      try {
        const absoluteUrl = new URL(url, base).href;
        return `${attr}="${absoluteUrl}"`;
      } catch {
        return match;
      }
    });
  } catch {
    return clean;
  }
}
