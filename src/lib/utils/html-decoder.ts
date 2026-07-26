/**
 * Utility to decode HTML entities in feed titles, article titles, and summaries.
 * Converts &#039; -> ', &amp; -> &, &quot; -> ", &lt; -> <, &gt; -> >
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
