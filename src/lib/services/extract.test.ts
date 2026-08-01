import { describe, expect, it, vi } from 'vitest';
import { createDocument, extractFromDocument, parseArticleHtml } from '@/lib/services/extract';
import { withTimeout } from '@/lib/utils/timeout';

const LONG_BODY =
  'This is a long body paragraph with plenty of words so that Readability scores it as article content. ' +
  'It continues with more sentences, more nouns and verbs, and enough structure to be treated as a proper paragraph of prose.';

describe('createDocument', () => {
  it('parses HTML into a document with title and body', async () => {
    const doc = await createDocument(`<html><head><title>Hello</title></head><body><p>x</p></body></html>`);
    expect(doc.title).toBe('Hello');
    expect(doc.body?.innerHTML).toContain('<p>x</p>');
  });
});

describe('extractFromDocument', () => {
  it('extracts title and readable content from an article page', async () => {
    const html = `<html><head><title>My Story</title></head><body><article><h1>My Story</h1><p>${LONG_BODY}</p></article></body></html>`;
    const doc = await createDocument(html);
    const result = extractFromDocument(doc, 'https://example.com/story');

    expect(result.title).toBe('My Story');
    expect(result.content).toContain('long body paragraph');
  });

  it('resolves og:image to an absolute lead image URL', async () => {
    const html = `<html><head><meta property="og:image" content="/img/hero.png"></head><body><p>${LONG_BODY}</p></body></html>`;
    const doc = await createDocument(html);
    const result = extractFromDocument(doc, 'https://example.com/story');

    expect(result.lead_image_url).toBe('https://example.com/img/hero.png');
  });

  it('falls back to JSON-LD articleBody when Readability finds little content', async () => {
    const body = 'Very sparse content here.';
    const html = `<html><head><script type="application/ld+json">{"@type":"NewsArticle","articleBody":"${body} is actually the full body and it is much longer than the visible text."}</script></head><body><p>${body}</p></body></html>`;
    const doc = await createDocument(html);
    const result = extractFromDocument(doc, 'https://example.com/story');

    expect(result.content).toContain('actually the full body');
  });

  it('falls back to main/article/body content when Readability finds nothing', async () => {
    const html = `<html><head><title>Plain</title></head><body><div id="content"><p>${LONG_BODY}</p></div></body></html>`;
    const doc = await createDocument(html);
    const result = extractFromDocument(doc, 'https://example.com/story');

    expect(result.content).toContain(LONG_BODY);
  });

  it('sanitizes away unsafe tags', async () => {
    const html = `<html><body><p>${LONG_BODY}</p><script>alert(1)</script></body></html>`;
    const doc = await createDocument(html);
    const result = extractFromDocument(doc, 'https://example.com/story');

    expect(result.content).not.toContain('<script');
    expect(result.content).toContain(LONG_BODY);
  });
});

describe('parseArticleHtml', () => {
  it('parses and extracts in the current context', async () => {
    const html = `<html><head><title>Title</title></head><body><p>${LONG_BODY}</p></body></html>`;
    const result = await parseArticleHtml(html, 'https://example.com/story');
    expect(result.title).toBe('Title');
    expect(result.content.length).toBeGreaterThan(0);
  });
});

describe('withTimeout', () => {
  it('resolves when the promise settles before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('done'), 500)).resolves.toBe('done');
  });

  it('rejects with a timeout error when the promise never settles', async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 10)).rejects.toThrow('timed out');
  });

  it('propagates an early rejection', async () => {
    const boom = Promise.reject(new Error('boom'));
    await expect(withTimeout(boom, 500)).rejects.toThrow('boom');
  });
});
