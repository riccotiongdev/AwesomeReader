/**
 * Regenerates the tiny EPUB fixture used by foliate-js spike tests.
 * Run: node scripts/make-fixture-epub.mjs
 * Outputs: src/fixtures/mini-book.epub (test fixture) and
 *          public/mini-book.epub (served copy for the on-device spike harness).
 *
 * Structure is a minimal valid EPUB 3: mimetype (stored, first), META-INF,
 * OEBPS package with nav document, stylesheet, and three chapters.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(tmpdir(), 'mini-book-epub');
rmSync(root, { recursive: true, force: true });

const write = (rel, content) => {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
};

// mimetype must be first entry, stored uncompressed, no trailing newline
write('mimetype', 'application/epub+zip');

write(
  'META-INF/container.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`
);

write(
  'OEBPS/content.opf',
  `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:mini-book-0001</dc:identifier>
    <dc:title>Mini Book</dc:title>
    <dc:creator>AwesomeReader Fixtures</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-02-18T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="ch3.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
  </spine>
</package>
`
);

write(
  'OEBPS/nav.xhtml',
  `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Contents</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Contents</h1>
      <ol>
        <li><a href="ch1.xhtml#start">Chapter 1</a></li>
        <li><a href="ch2.xhtml#start">Chapter 2</a></li>
        <li><a href="ch3.xhtml#start">Chapter 3</a></li>
      </ol>
    </nav>
  </body>
</html>
`
);

write(
  'OEBPS/style.css',
  `body { font-family: Georgia, serif; line-height: 1.6; }
h1 { font-size: 1.8em; margin-bottom: 0.5em; }
`
);

const chapter = (n, title, paragraphs) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>${title}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
  <body>
    <h1 id="start">${title}</h1>
    ${paragraphs.map((p) => `<p>${p}</p>`).join('\n    ')}
  </body>
</html>
`;

write(
  'OEBPS/ch1.xhtml',
  chapter(
    '1',
    'Chapter 1',
    [
      'Once upon a time, a reader opened this very book on a small screen.',
      'The words flowed like water, reflowing around the margins of a tiny device.',
      'Pagination happened. Pages turned. The reader was pleased.',
      'This paragraph exists so that the chapter has enough text to occupy more than a single page at small font sizes.',
    ]
  )
);

write(
  'OEBPS/ch2.xhtml',
  chapter(
    '2',
    'Chapter 2',
    [
      'The reader tapped the table of contents and leapt between chapters.',
      'Each jump landed exactly where the previous session had stopped.',
      'Themes changed from pitch black to warm sepia, and back again.',
      'This paragraph exists so that the chapter has enough text to occupy more than a single page at small font sizes.',
    ]
  )
);

write(
  'OEBPS/ch3.xhtml',
  chapter(
    '3',
    'Chapter 3',
    [
      'At last the final page arrived, and the shelf marked the book as finished.',
      'The story ended, but the reader knew a hundred more EPUBs awaited import.',
      'This paragraph exists so that the chapter has enough text to occupy more than a single page at small font sizes.',
    ]
  )
);

// mimetype first, stored, uncompressed (-X0); then everything else (-Xr9)
execFileSync('zip', ['-X0', '-q', 'mini-book.epub', 'mimetype'], { cwd: root });
execFileSync('zip', ['-Xr9', '-q', 'mini-book.epub', 'META-INF', 'OEBPS'], { cwd: root });
if (!existsSync(join(root, 'mini-book.epub'))) {
  throw new Error(`zip produced no archive; dir contents: ${readdirSync(root).join(', ')}`);
}

const out = new URL('../src/fixtures/mini-book.epub', import.meta.url).pathname;
const outPublic = new URL('../public/mini-book.epub', import.meta.url).pathname;
mkdirSync(new URL('../src/fixtures', import.meta.url).pathname, { recursive: true });
copyFileSync(join(root, 'mini-book.epub'), out);
copyFileSync(join(root, 'mini-book.epub'), outPublic);
rmSync(root, { recursive: true, force: true });
console.log(`fixture written to ${out}`);
