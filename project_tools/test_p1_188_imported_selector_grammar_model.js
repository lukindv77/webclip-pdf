'use strict';

const assert = require('assert');

const SELECTOR_GRAMMAR_VERSION = 1;
const MAX_SEGMENTS = 64;
const MAX_ID_CHARS = 512;
const TAG_RE = /^[a-z][a-z0-9-]{0,63}$/;

function normalizeStructuredPath(locator) {
  if (!locator || Number(locator.selectorGrammarVersion) !== SELECTOR_GRAMMAR_VERSION) return null;
  const raw = locator.selectorPath;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_SEGMENTS) return null;
  const out = [];
  for (const segment of raw) {
    if (!segment || typeof segment !== 'object') return null;
    const kind = String(segment.kind || '');
    if (kind === 'body') {
      if (Object.keys(segment).some((key) => !['kind'].includes(key))) return null;
      out.push({ kind: 'body' });
      continue;
    }
    if (kind === 'id') {
      const value = String(segment.value || '');
      if (!value || value.length > MAX_ID_CHARS) return null;
      out.push({ kind: 'id', value });
      continue;
    }
    if (kind === 'tag') {
      const tag = String(segment.tag || '').toLowerCase();
      const nth = Number(segment.nthOfType || 0);
      if (!TAG_RE.test(tag)) return null;
      if (!Number.isInteger(nth) || nth < 0 || nth > 100000) return null;
      out.push({ kind: 'tag', tag, nthOfType: nth });
      continue;
    }
    return null;
  }
  return out;
}

function sanitizeImportedLocator(raw) {
  const selectorPath = normalizeStructuredPath(raw);
  return {
    selectorGrammarVersion: selectorPath ? SELECTOR_GRAMMAR_VERSION : 0,
    selectorPath: selectorPath || [],
    // Legacy/native CSS text is intentionally not imported as executable authority.
    cssPath: '',
    domPath: Array.isArray(raw?.domPath) ? raw.domPath.filter(Number.isInteger).slice(0, 128) : [],
    tag: String(raw?.tag || '').slice(0, 64),
    id: String(raw?.id || '').slice(0, 512)
  };
}

function resolveStructuredPath(path, tree) {
  // Tiny deterministic architecture model; no native CSS parser exists here.
  let current = tree;
  for (const segment of path) {
    if (segment.kind === 'body') {
      current = current?.body || null;
    } else if (segment.kind === 'id') {
      current = tree?.byId?.[segment.value] || null;
    } else if (segment.kind === 'tag') {
      const children = Array.isArray(current?.children) ? current.children : [];
      const matches = children.filter((child) => child.tag === segment.tag);
      current = segment.nthOfType > 0 ? (matches[segment.nthOfType - 1] || null) : (matches.length === 1 ? matches[0] : null);
    }
    if (!current) return null;
  }
  return current;
}

const tree = {
  body: {
    tag: 'body',
    children: [
      { tag: 'main', children: [{ tag: 'article', id: 'story', children: [] }] },
      { tag: 'main', children: [] }
    ]
  },
  byId: {
    story: { tag: 'article', id: 'story', children: [] }
  }
};

let safe = sanitizeImportedLocator({
  selectorGrammarVersion: 1,
  selectorPath: [
    { kind: 'body' },
    { kind: 'tag', tag: 'main', nthOfType: 1 },
    { kind: 'tag', tag: 'article', nthOfType: 0 }
  ],
  cssPath: 'body > main:nth-of-type(1) > article'
});
assert.equal(safe.selectorGrammarVersion, 1);
assert.equal(safe.cssPath, '');
assert.equal(resolveStructuredPath(safe.selectorPath, tree)?.id, 'story');

for (const cssPath of [
  'body:has(.secret)',
  'body, #other',
  '[data-token]',
  'main:not(:first-child)',
  ':scope *',
  'body > *'
]) {
  const imported = sanitizeImportedLocator({ cssPath });
  assert.equal(imported.selectorGrammarVersion, 0);
  assert.deepEqual(imported.selectorPath, []);
  assert.equal(imported.cssPath, '');
}

safe = sanitizeImportedLocator({
  selectorGrammarVersion: 999,
  selectorPath: [{ kind: 'body' }],
  cssPath: 'body'
});
assert.equal(safe.selectorGrammarVersion, 0, 'unknown grammar version must fail closed');

safe = sanitizeImportedLocator({
  selectorGrammarVersion: 1,
  selectorPath: [{ kind: 'tag', tag: 'main', nthOfType: 100001 }]
});
assert.equal(safe.selectorGrammarVersion, 0, 'out-of-envelope selector token must be ignored');

safe = sanitizeImportedLocator({
  selectorGrammarVersion: 1,
  selectorPath: [{ kind: 'id', value: 'x'.repeat(MAX_ID_CHARS + 1) }]
});
assert.equal(safe.selectorGrammarVersion, 0, 'oversized id token must be ignored before resolution');

// Ignoring imported CSS is not the same as rejecting the entire locator:
// structural fallback fields remain available to the ordinary restore scorer.
safe = sanitizeImportedLocator({
  cssPath: 'article:has(a[href*=secret])',
  domPath: [0, 1, 2],
  tag: 'article',
  id: 'story'
});
assert.deepEqual(safe.domPath, [0, 1, 2]);
assert.equal(safe.tag, 'article');
assert.equal(safe.id, 'story');

console.log('P1-188 imported selector grammar model: PASS');
