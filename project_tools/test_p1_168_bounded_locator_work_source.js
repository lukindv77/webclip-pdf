'use strict';

const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '..', 'content.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 14000) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) return '';
  return content.slice(start, start + maxChars);
}

requireSource(/LOCATOR_MAX_SIBLING_VISITS/.test(content),
  'missing explicit locator sibling-work bound');
requireSource(/LOCATOR_MAX_CLASS_TOKENS/.test(content),
  'missing early class-token bound');
requireSource(/LOCATOR_MAX_CLASS_CHARS/.test(content),
  'missing aggregate class-string work bound');
requireSource(/LOCATOR_TEXT_INPUT_MAX_CHARS/.test(content),
  'missing locator text input-work bound');
requireSource(/LOCATOR_SELECTOR_INPUT_MAX_CHARS/.test(content),
  'missing page-controlled selector input bound before escaping/parsing');
requireSource(/LOCATOR_MAX_PATH_DEPTH/.test(content),
  'missing named structural path depth bound');

requireSource(/boundedSiblingPosition|locatorSiblingReceipt/.test(content),
  'missing bounded sibling-position helper');
requireSource(/boundedLocatorClass|collectLocatorClassesBounded/.test(content),
  'missing bounded class-token extraction helper');
requireSource(/boundedLocatorText|locatorTextBounded/.test(content),
  'missing bounded locator text acquisition helper');
requireSource(/boundedLocatorSelector|selectorInputBounded/.test(content),
  'missing selector-input admission helper');

const simple = functionSlice('createSimpleElementLocator');
requireSource(Boolean(simple), 'cannot locate createSimpleElementLocator()');
requireSource(!/\[\.\.\.\(element\?\.classList/.test(simple),
  'createSimpleElementLocator() still spreads the complete page-controlled classList');
requireSource(!/\[\.\.\.parent\.children\]/.test(simple),
  'createSimpleElementLocator() still materializes all siblings before computing indexes');
requireSource(/boundedSiblingPosition|locatorSiblingReceipt/.test(simple),
  'createSimpleElementLocator() does not use the bounded sibling-position contract');

const structural = functionSlice('buildStructuralCssPath');
requireSource(Boolean(structural), 'cannot locate buildStructuralCssPath()');
requireSource(!/\[\.\.\.current\.parentElement\.children\]/.test(structural),
  'buildStructuralCssPath() still materializes/filter all same-tag siblings per ancestor');
requireSource(/LOCATOR_SELECTOR_INPUT_MAX_CHARS|boundedLocatorSelector|selectorInputBounded/.test(structural),
  'structural path can still pass unbounded page-controlled id/class input into selector escaping/parsing');
requireSource(/LOCATOR_MAX_PATH_DEPTH/.test(structural),
  'structural path still relies on an unnamed hard-coded depth only');

const locatorText = functionSlice('locatorElementText', 5000);
requireSource(Boolean(locatorText), 'cannot locate locatorElementText()');
requireSource(!/normalizeLocatorText\(element\.innerText\s*\|\|\s*element\.textContent/.test(locatorText),
  'locatorElementText() still materializes/normalizes full element text before slicing output');
requireSource(/boundedLocatorText|locatorTextBounded/.test(locatorText),
  'locatorElementText() does not use early bounded text acquisition');

const score = functionSlice('scoreLocatorCandidateV3');
requireSource(Boolean(score), 'cannot locate scoreLocatorCandidateV3()');
requireSource(!/\[\.\.\.parent\.children\]/.test(score),
  'locator scoring still materializes all siblings for each candidate');
requireSource(/boundedSiblingPosition|locatorSiblingReceipt/.test(score),
  'locator scoring does not reuse bounded sibling-position semantics');

// Positive control: existing tag candidate enumeration is already index-bounded and should remain so.
const collectTag = functionSlice('collectTagCandidatesBounded', 5000);
requireSource(/getElementsByTagName/.test(collectTag) && /safeLimit/.test(collectTag),
  'existing bounded live tag-candidate enumeration positive control disappeared');

if (failures.length) {
  console.error('P1-168 bounded locator creation/scoring source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-168 bounded locator creation/scoring source gate: PASS');
