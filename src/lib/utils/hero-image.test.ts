import { describe, expect, it } from 'vitest';
import {
  normalizeImageUrl,
  firstImageSrc,
  bodyLeadsWithImage,
} from '@/lib/utils/hero-image';

describe('normalizeImageUrl', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeImageUrl('  https://example.com/a.jpg  ')).toBe('https://example.com/a.jpg');
  });

  it('upgrades protocol-relative URLs to https', () => {
    expect(normalizeImageUrl('//example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('strips URL fragments', () => {
    expect(normalizeImageUrl('https://example.com/a.jpg#frag')).toBe('https://example.com/a.jpg');
  });

  it('lowercases the host and drops default ports', () => {
    expect(normalizeImageUrl('HTTPS://EXAMPLE.com:443/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('returns the trimmed input for relative URLs', () => {
    expect(normalizeImageUrl('/a.jpg')).toBe('/a.jpg');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeImageUrl('')).toBe('');
  });
});

describe('firstImageSrc', () => {
  it('returns null for empty or non-image HTML', () => {
    expect(firstImageSrc('')).toBeNull();
    expect(firstImageSrc('<p>just text</p>')).toBeNull();
  });

  it('extracts a double-quoted src', () => {
    expect(firstImageSrc('<p><img src="https://example.com/a.jpg" alt="a"></p>')).toBe(
      'https://example.com/a.jpg'
    );
  });

  it('extracts a single-quoted src', () => {
    expect(firstImageSrc("<img src='https://example.com/b.jpg' />")).toBe(
      'https://example.com/b.jpg'
    );
  });

  it('extracts an unquoted src', () => {
    expect(firstImageSrc('<img src=https://example.com/c.jpg>')).toBe('https://example.com/c.jpg');
  });

  it('decodes HTML entities in the src', () => {
    expect(firstImageSrc('<img src="https://example.com/a&amp;b.jpg">')).toBe(
      'https://example.com/a&b.jpg'
    );
  });

  it('skips an img without a usable src and uses the next one', () => {
    expect(firstImageSrc('<img alt="no src"><img src="https://example.com/a.jpg">')).toBe(
      'https://example.com/a.jpg'
    );
  });

  it('ignores data URI images', () => {
    expect(firstImageSrc('<img src="data:image/gif;base64,R0lGODlh"><img src="https://example.com/a.jpg">')).toBe(
      'https://example.com/a.jpg'
    );
  });

  it('ignores tracking pixels', () => {
    expect(firstImageSrc('<img src="https://tracker.example.com/pixel.gif"><img src="https://example.com/a.jpg">')).toBe(
      'https://example.com/a.jpg'
    );
  });
});

describe('bodyLeadsWithImage', () => {
  it('is true when the body leads with the same image', () => {
    const body = '<figure><img src="https://example.com/hero.jpg"></figure><p>text</p>';
    expect(bodyLeadsWithImage(body, 'https://example.com/hero.jpg')).toBe(true);
  });

  it('is true when the body src and hero differ only by protocol-relative scheme', () => {
    expect(bodyLeadsWithImage('<img src="//example.com/hero.jpg">', 'https://example.com/hero.jpg')).toBe(true);
  });

  it('is true when the body src uses HTML entities', () => {
    expect(bodyLeadsWithImage('<img src="https://example.com/a&amp;b.jpg">', 'https://example.com/a&b.jpg')).toBe(true);
  });

  it('is false when the body leads with a different image', () => {
    expect(bodyLeadsWithImage('<img src="https://example.com/other.jpg">', 'https://example.com/hero.jpg')).toBe(false);
  });

  it('is false when the hero image appears later but not as the first image', () => {
    const body =
      '<p>intro</p><img src="https://example.com/other.jpg"><img src="https://example.com/hero.jpg">';
    expect(bodyLeadsWithImage(body, 'https://example.com/hero.jpg')).toBe(false);
  });

  it('is false without a hero URL or body', () => {
    expect(bodyLeadsWithImage('<img src="https://example.com/hero.jpg">', null)).toBe(false);
    expect(bodyLeadsWithImage('', 'https://example.com/hero.jpg')).toBe(false);
    expect(bodyLeadsWithImage('', null)).toBe(false);
  });

  it('is false when the body has no usable images', () => {
    expect(bodyLeadsWithImage('<p>just text</p>', 'https://example.com/hero.jpg')).toBe(false);
  });
});
