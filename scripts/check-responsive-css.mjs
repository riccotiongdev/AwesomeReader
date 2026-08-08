#!/usr/bin/env node
/**
 * Responsive CSS regression guard (added after a session where the
 * News|Books header switcher was visible on mobile twice in a row).
 *
 * Failure mode it guards against: base rules placed AFTER the breakpoint
 * media queries override them (equal specificity, later source wins), and a
 * `<div>` with no applicable `display` rule computes to `display: block`
 * instead of hiding.
 *
 * Invariants for the space switcher (ADR-0003):
 *   - `.space-switcher` (a div!) must be explicitly `display: none` inside a
 *     `(max-width: 520px)` media query and `display: flex` inside a
 *     `(min-width: 521px)` media query.
 *   - No top-level (outside any media query) rule for `.space-switcher` may
 *     declare `display` — that is the source-order bug that made the pill
 *     render at every width.
 *   - `.space-mode-btn` (mobile-only chip) must not declare `display` at top
 *     level; its visibility comes solely from `.mobile-only` (base `none`,
 *     `flex` under 520px). Otherwise the chip would show on desktop too.
 *   - The retired bottom tab bar (`.bottom-tab-bar` / `.bottom-tab`) must
 *     not reappear.
 *
 * Usage: `node scripts/check-responsive-css.mjs [path-to-css]` (defaults to
 * src/app/globals.css). Exit 0 on pass, 1 on failure. Wired into `npm test`
 * via package.json.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cssPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  process.argv[2] ?? 'src/app/globals.css'
);

const css = readFileSync(cssPath, 'utf8')
  // Comments can mention selectors and display values; drop them first.
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Flatten the CSS into rules with their enclosing media condition.
 * Handles one level of @media nesting; other at-rules (keyframes etc.)
 * are skipped. Selector strings keep commas, so callers split on them.
 */
function flatten(text) {
  const rules = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;

    if (text[i] === '}') {
      i++;
      continue;
    }

    const preludeStart = i;
    while (i < n && text[i] !== '{') i++;
    if (i >= n) break;
    const prelude = text.slice(preludeStart, i).trim();
    i++; // consume '{'

    let depth = 1;
    const bodyStart = i;
    while (i < n && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(bodyStart, i - 1);

    if (prelude.startsWith('@media')) {
      const cond = prelude.replace(/^@media\s*/, '').trim();
      // One nesting level: rules inside the media block.
      let j = 0;
      while (j < body.length) {
        while (j < body.length && /\s/.test(body[j])) j++;
        if (j >= body.length) break;
        if (body[j] === '}') { j++; continue; }
        const s = j;
        while (j < body.length && body[j] !== '{') j++;
        if (j >= body.length) break;
        const sel = body.slice(s, j).trim();
        j++;
        let d = 1;
        const bs = j;
        while (j < body.length && d > 0) {
          if (body[j] === '{') d++;
          else if (body[j] === '}') d--;
          j++;
        }
        if (!sel.startsWith('@')) {
          rules.push({ selector: sel, declarations: body.slice(bs, j - 1), media: cond });
        }
      }
    } else if (!prelude.startsWith('@')) {
      rules.push({ selector: prelude, declarations: body, media: null });
    }
    // Other at-rules (keyframes, font-face, ...) are skipped.
  }
  return rules;
}

const rules = flatten(css);
const norm = (s) => s.replace(/\s+/g, '');
const inMobile = (media) => media !== null && norm(media).includes('(max-width:520px)');
const inDesktop = (media) => media !== null && norm(media).includes('(min-width:521px)');
const matches = (selector, cls) =>
  selector.split(',').map((s) => s.trim()).includes(cls);
const declares = (rule, prop, value) =>
  norm(rule.declarations).includes(`${prop}:${value}`);

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

// --- .space-switcher (the header pill; a div — needs explicit display) ---
const pillMobile = rules.find((r) => matches(r.selector, '.space-switcher') && inMobile(r.media));
check(pillMobile, '.space-switcher must be hidden inside a (max-width: 520px) media query');
if (pillMobile) {
  check(
    declares(pillMobile, 'display', 'none'),
    '.space-switcher must declare display:none inside (max-width: 520px) — a div defaults to display:block'
  );
}

const pillDesktop = rules.find((r) => matches(r.selector, '.space-switcher') && inDesktop(r.media));
check(pillDesktop, '.space-switcher must be shown inside a (min-width: 521px) media query');
if (pillDesktop) {
  check(
    declares(pillDesktop, 'display', 'flex'),
    '.space-switcher must declare display:flex inside (min-width: 521px)'
  );
}

const pillTopLevel = rules.find(
  (r) => matches(r.selector, '.space-switcher') && r.media === null
);
check(
  !pillTopLevel || !/\bdisplay\s*:/.test(pillTopLevel.declarations),
  'no top-level (unscoped) rule may declare display on .space-switcher — it would override the mobile media query (source-order bug)'
);

// --- .space-mode-btn (mobile-only chip) ---
const chip = rules.find((r) => matches(r.selector, '.space-mode-btn') && r.media === null);
check(chip, '.space-mode-btn base rule not found');
if (chip) {
  check(
    !/\bdisplay\s*:/.test(chip.declarations),
    '.space-mode-btn must not declare display at top level — visibility is controlled by .mobile-only, or it shows on desktop too'
  );
}

// --- .mobile-only (base hidden, flex on mobile) ---
const mobileOnlyBase = rules.find((r) => matches(r.selector, '.mobile-only') && r.media === null);
check(mobileOnlyBase, '.mobile-only base rule not found');
if (mobileOnlyBase) {
  check(
    declares(mobileOnlyBase, 'display', 'none'),
    '.mobile-only must be display:none at the base (desktop) level'
  );
}
const mobileOnlyMobile = rules.find(
  (r) => matches(r.selector, '.mobile-only') && inMobile(r.media)
);
check(mobileOnlyMobile, '.mobile-only must become display:flex inside (max-width: 520px)');
if (mobileOnlyMobile) {
  check(
    declares(mobileOnlyMobile, 'display', 'flex'),
    '.mobile-only must declare display:flex inside (max-width: 520px)'
  );
}

// --- Retired bottom tab bar must not reappear ---
const bottomBar = rules.find(
  (r) => matches(r.selector, '.bottom-tab-bar') || matches(r.selector, '.bottom-tab')
);
check(!bottomBar, 'retired bottom tab bar rules (.bottom-tab-bar / .bottom-tab) must not exist — the mobile chip+modal replaced it');

if (failures.length > 0) {
  console.error(`✗ responsive CSS guard failed for ${cssPath}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✓ responsive CSS guard OK (${cssPath})`);
