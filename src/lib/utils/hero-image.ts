import { decodeHtmlEntities } from './html-decoder';

const IMG_SRC_PATTERN = '<img[^>]*?\\bsrc\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))';
const DATA_URI_REGEX = /^data:/i;

/**
 * True when the URL looks like a tracking/placeholder pixel rather than a real
 * lead image. Mirrors the heuristics used in feed-crawler when choosing an
 * article image so placeholders never count as the body's lead image.
 */
function isTrackerPixel(src: string): boolean {
  return src.includes('tracker') || src.includes('pixel') || src.includes('1x1');
}

/**
 * Normalize an image URL so that equivalent URLs compare equal: trims
 * whitespace, upgrades protocol-relative (//host/...) URLs to https, and lets
 * the WHATWG URL parser strip fragments, drop default ports, and lowercase the
 * host. Relative or malformed URLs fall back to the trimmed original.
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }
  try {
    const parsed = new URL(normalized);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return normalized;
  }
}

/**
 * Extract the src of the first usable <img> in an HTML string. Returns null
 * when there is no usable image. Data URIs and tracking/placeholder pixels are
 * ignored so they never count as the body's lead image.
 */
export function firstImageSrc(html: string): string | null {
  if (!html) return null;
  // Fresh regex per call: a module-level /g regex would leak lastIndex across
  // calls and resume from the wrong position on subsequent invocations.
  const regex = new RegExp(IMG_SRC_PATTERN, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3];
    const src = decodeHtmlEntities(raw).trim();
    if (!src || DATA_URI_REGEX.test(src) || isTrackerPixel(src)) continue;
    return src;
  }
  return null;
}

/**
 * True when the article body already leads with the same image as the hero
 * (article.image_url). In that case rendering the hero would show the image
 * twice, since the body's own copy appears right below it.
 */
export function bodyLeadsWithImage(html: string, heroUrl?: string | null): boolean {
  if (!html || !heroUrl) return false;
  const bodySrc = firstImageSrc(html);
  if (!bodySrc) return false;
  return normalizeImageUrl(bodySrc) === normalizeImageUrl(heroUrl);
}
