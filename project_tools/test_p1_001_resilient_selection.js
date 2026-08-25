const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

function testProductionContracts() {
  const selection = section(content, '  function serializeSelectionSnapshot()', '  let outlineUpdateScheduled = false;');
  assert(selection.includes('version: 3'), 'new snapshots must be SelectionSnapshot v3');
  for (const field of ['role', 'href', 'parentTag', 'parentText', 'previousText', 'nextText', 'siblingIndex', 'sameTagIndex']) {
    assert(selection.includes(`${field}:`), `v3 fingerprint must preserve ${field}`);
  }
  assert(selection.includes('resolveElementLocatorV3InDocument'), 'v3 must use scored resolver');
  assert(selection.includes('scoreLocatorCandidateV3'), 'v3 candidates must be scored');
  assert(selection.includes("confidence: 'ambiguous'"), 'close candidate competition must become ambiguity');
  assert(selection.includes('margin < 18'), 'ambiguity must use an explicit close-candidate margin');
  assert(selection.includes("confidence = best.score >= 60"), 'high/medium confidence classification must be explicit');
  assert(selection.includes('ambiguousIncludes += 1'), 'ambiguous Include restore must fail closed');
  assert(selection.includes('ambiguousExcludes += 1'), 'ambiguous Exclude restore must fail closed');
  assert(selection.includes('missingIncludes: failedIncludes'), 'restore response must expose missing aliases consumed by Journal diagnostics');

  const journalRestore = section(journal, 'async function applyEntry(entry)', 'const DELETE_OPERATION_STAGES');
  assert(journalRestore.includes('result.confidenceHigh'), 'Journal must surface high-confidence restore count');
  assert(journalRestore.includes('result.confidenceMedium'), 'Journal must surface medium-confidence restore count');
  assert(journalRestore.includes('result.ambiguousIncludes'), 'Journal must surface ambiguity diagnostics');
  assert(/они не применены/i.test(journalRestore), 'Journal must state that ambiguous matches were not applied');

  const journalDetails = section(journal, 'function buildSelectionDetails', 'function buildLocatorGroup');
  assert(journalDetails.includes('Restore v3'), 'Journal details must identify v3 contextual restore snapshots');
  assert(journalDetails.includes('Legacy restore'), 'Journal details must distinguish legacy snapshots');
}

function testSanitizerPreservesV3AndBoundsFields() {
  const sanitizerCode = section(sw, 'function sanitizeSelectionSnapshot', 'let journalRevisionWriteInFlight');
  const context = vm.createContext({
    JSON, Number, String, Array, Math, Error,
    MAX_SELECTION_SNAPSHOT_JSON_CHARS: 2 * 1024 * 1024,
    jsonSizeChars(value) {
      try { return JSON.stringify(value).length; } catch (_) { return Number.MAX_SAFE_INTEGER; }
    }
  });
  vm.runInContext(`${sanitizerCode}\nthis.sanitizeForTest = sanitizeSelectionSnapshot;`, context);
  const noisy = 'x'.repeat(5000);
  const snapshot = {
    version: 3,
    includes: [{
      cssPath: 'body > main > section', domPath: [1, 2], tag: 'section', id: '', classes: ['article-card'],
      text: 'Alpha', ariaLabel: 'Primary article', name: '', title: '', src: '', role: 'article', href: '/doc',
      parentTag: 'main', parentId: 'container', parentRole: 'main', parentText: noisy,
      previousText: noisy, nextText: noisy, siblingIndex: 2, sameTagIndex: 1,
      framePath: [{ tag: 'iframe', role: 'document', parentText: noisy, siblingIndex: 0, sameTagIndex: 0 }]
    }],
    excludes: []
  };
  const safe = context.sanitizeForTest(snapshot, { rejectOverflow: true });
  assert.strictEqual(safe.version, 3, 'service worker must not down-convert SelectionSnapshot v3');
  const locator = safe.includes[0];
  assert.strictEqual(locator.role, 'article');
  assert.strictEqual(locator.href, '/doc');
  assert.strictEqual(locator.parentTag, 'main');
  assert.strictEqual(locator.siblingIndex, 2);
  assert.strictEqual(locator.sameTagIndex, 1);
  assert(locator.parentText.length <= 240, 'parent context must stay bounded');
  assert(locator.previousText.length <= 180, 'previous-neighbor context must stay bounded');
  assert(locator.nextText.length <= 180, 'next-neighbor context must stay bounded');
  assert.strictEqual(safe.includes[0].framePath[0].role, 'document', 'frame locator fingerprints must survive sanitization');
}

function testLegacyVersionCompatibilityContract() {
  const sanitizerCode = section(sw, 'function sanitizeSelectionSnapshot', 'let journalRevisionWriteInFlight');
  const context = vm.createContext({
    JSON, Number, String, Array, Math, Error,
    MAX_SELECTION_SNAPSHOT_JSON_CHARS: 2 * 1024 * 1024,
    jsonSizeChars(value) { return JSON.stringify(value).length; }
  });
  vm.runInContext(`${sanitizerCode}\nthis.sanitizeForTest = sanitizeSelectionSnapshot;`, context);
  assert.strictEqual(context.sanitizeForTest({ version: 2, includes: [], excludes: [] }).version, 2);
  assert.strictEqual(context.sanitizeForTest({ version: 1, includes: [], excludes: [] }).version, 1);

  const resolver = section(content, '  function resolveElementLocatorInDocumentDetailed', '  function resolveElementLocatorLegacyInDocument');
  assert(resolver.includes('Number(snapshotVersion || 1) < 3'), 'v1/v2 restore must keep a dedicated legacy branch');
  assert(resolver.includes("confidence: element ? 'legacy' : 'none'"), 'legacy restore outcome must be explicitly identified');
}

testProductionContracts();
testSanitizerPreservesV3AndBoundsFields();
testLegacyVersionCompatibilityContract();
console.log('PASS P1-001 resilient SelectionSnapshot v3 contracts and sanitizer');
