'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const content = fs.readFileSync(path.resolve(__dirname, '..', 'content.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 18000) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  return source.slice(start, start + maxChars);
}

requireSource(/SELECTOR_GRAMMAR_VERSION|LOCATOR_SELECTOR_GRAMMAR_VERSION/.test(worker) || /SELECTOR_GRAMMAR_VERSION|LOCATOR_SELECTOR_GRAMMAR_VERSION/.test(content),
  'missing named/versioned WebClip selector grammar');
requireSource(/selectorGrammarVersion/.test(worker),
  'worker selection sanitizer does not preserve/validate selectorGrammarVersion');
requireSource(/selectorPath/.test(worker),
  'worker selection sanitizer does not normalize structured selectorPath');
requireSource(/sanitizeImportedSelector|normalizeLocatorSelectorPath|sanitizeSelectorPath/.test(worker),
  'missing worker-side structured selector grammar sanitizer');

const sanitize = functionSlice(worker, 'sanitizeSelectionSnapshot', 26000);
requireSource(Boolean(sanitize), 'cannot locate worker sanitizeSelectionSnapshot()');
requireSource(!/cssPath:\s*String\(locator\.cssPath\s*\|\|\s*''\)\.slice/.test(sanitize),
  'worker still preserves imported cssPath as a bounded executable string');
requireSource(/selectorGrammarVersion/.test(sanitize) && /selectorPath/.test(sanitize),
  'worker snapshot sanitizer is not wired to the versioned structured selector contract');

const resolve = functionSlice(content, 'resolveElementLocatorV3InDocument', 26000);
requireSource(Boolean(resolve), 'cannot locate resolveElementLocatorV3InDocument()');
requireSource(/resolveStructuredSelectorPath|resolveLocatorSelectorPath|resolveWebClipSelectorPath/.test(content),
  'missing WebClip-owned structured selector resolver');
requireSource(/selectorGrammarVersion/.test(resolve) || /selectorPath/.test(resolve),
  'locator restore does not consume structured selector receipt');
requireSource(!/ownerDoc\.querySelector\(locator\.cssPath\)/.test(resolve),
  'restore still passes durable/imported locator.cssPath directly to native querySelector()');

// No compatibility fallback elsewhere in content.js may re-enable arbitrary imported CSS authority.
requireSource(!/querySelector\(\s*locator\.cssPath\s*\)/.test(content),
  'content.js still executes locator.cssPath through a native selector parser');

// Positive control: structural fallback remains available when legacy cssPath is ignored.
requireSource(/resolveDomPathCandidate\(locator\.domPath/.test(resolve),
  'domPath fallback disappeared; P1-188 must ignore legacy cssPath without discarding all restore evidence');
requireSource(/collectTagCandidatesBounded/.test(resolve),
  'bounded tag-candidate fallback disappeared');

// Nested frame-path locators must pass the same sanitizer/resolver contract recursively.
requireSource(/framePath/.test(sanitize),
  'worker snapshot sanitizer no longer handles nested framePath locators');
requireSource(/framePath/.test(content),
  'content restore no longer handles framePath locators');

if (failures.length) {
  console.error('P1-188 imported selector grammar source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-188 imported selector grammar source gate: PASS');
