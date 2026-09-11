'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const journal = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_206_JOURNAL_COMPOSITE_REVISION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');

const BASELINE = 'd33b5ea2b8103062dfed2805090bbf465fb00ae1';
const SCHEMA = 'webclip-journal-composite-source-revision/v1';
let cases = 0;
const failures = [];

function check(condition, message) {
  cases += 1;
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 60000) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const syncStart = source.indexOf(`function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  return start < 0 ? '' : source.slice(start, start + maxChars);
}

function count(source, needle) {
  if (!needle) return 0;
  let result = 0;
  let offset = 0;
  while (true) {
    const index = source.indexOf(needle, offset);
    if (index < 0) return result;
    result += 1;
    offset = index + needle.length;
  }
}

const loadJournal = functionSlice(journal, 'loadJournal', 32000);
const renderCurrentEntries = functionSlice(journal, 'renderCurrentEntries', 50000);
const syncBaseline = functionSlice(journal, 'syncJournalRevisionBaseline', 3000);
const readRevisionToken = functionSlice(journal, 'readJournalRevisionToken', 5000);
const touchRevision = functionSlice(worker, 'touchJournalDbRevision', 5000);
const updateEntry = functionSlice(worker, 'updateJournalEntryRecord', 10000);

// Canonical owner and exact tranche binding.
check(registry.includes('| P1-206 | ACTIVE | One Journal composed view/page/group boundary must be exact source revision coherent; mixed A/B view cannot be baselined as current. |'),
  'P1-206 Registry owner/status drifted');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'P1-206 evidence baseline mismatch');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('P1-206 remains **ACTIVE**'), 'P1-206 ACTIVE implementation boundary missing');

// Current durable Journal source revision positive control.
check(worker.includes("const JOURNAL_META_STORE = 'meta';"), 'Journal meta store missing');
check(worker.includes("const JOURNAL_META_REVISION_KEY = 'revision';"), 'Journal revision meta key missing');
check(Boolean(touchRevision), 'touchJournalDbRevision() missing');
check(touchRevision.includes('tx.objectStore(JOURNAL_META_STORE)'), 'revision writer no longer uses transaction meta store');
check(touchRevision.includes('JOURNAL_META_REVISION_KEY'), 'revision writer no longer writes revision key');
check(worker.includes("touchJournalDbRevision(tx, 'append')"), 'append no longer advances Journal DB revision; refresh research');
check(updateEntry.includes("[JOURNAL_STORE, JOURNAL_META_STORE], 'readwrite'"), 'update path no longer includes entries+meta in one transaction');
check(updateEntry.includes("touchJournalDbRevision(tx, 'update-entry')"), 'update path no longer advances Journal DB revision');
check(worker.includes("touchJournalDbRevision(tx, 'delete-entry')"), 'delete path no longer advances Journal DB revision');
check(worker.includes('touchJournalDbRevision(tx, `clear-${scope}`)'), 'clear path no longer advances Journal DB revision');
check(worker.includes("touchJournalDbRevision(tx, 'import-replace')"), 'import replace no longer advances Journal DB revision');

// Current read-side gap: direct and fallback view transactions are separate entries-only snapshots.
check(journal.includes("const JOURNAL_META_STORE = 'meta';"), 'journal page no longer knows meta store; refresh research');
check(count(journal, "db.transaction(JOURNAL_STORE, 'readonly')") >= 5,
  'direct Journal view no longer exposes expected entries-only readonly transaction family; refresh research');
check(count(worker, "db.transaction(JOURNAL_STORE, 'readonly')") >= 4,
  'service-worker Journal reads no longer expose expected entries-only readonly transaction family; refresh research');
check(!journal.includes('sourceRevision'), 'journal.js now contains sourceRevision; P1-206 current gap needs revalidation');
check(!worker.includes('sourceRevision'), 'service-worker.js now contains sourceRevision; P1-206 current gap needs revalidation');

// Current load/baseline ordering witness.
check(Boolean(loadJournal), 'loadJournal() missing');
check(loadJournal.includes('const generation = ++journalLoadGeneration;'), 'journal load-generation positive control missing');
const metaPos = loadJournal.indexOf('readJournalViewMetaWithFallback');
const renderPos = loadJournal.indexOf('await renderCurrentEntries()');
const baselinePos = loadJournal.indexOf('await syncJournalRevisionBaseline()');
check(metaPos >= 0 && renderPos > metaPos && baselinePos > renderPos,
  'metadata -> render -> baseline current ordering changed; refresh research');
check(Boolean(syncBaseline), 'syncJournalRevisionBaseline() missing');
check(syncBaseline.includes('lastJournalRevisionToken = await readJournalRevisionToken()'),
  'baseline no longer adopts separate revision token; refresh research');
check(Boolean(readRevisionToken), 'readJournalRevisionToken() missing');
check(readRevisionToken.includes("chrome.storage.local.get('webclipJournalRevision')"),
  'revision token no longer comes from Chrome Storage notification; refresh research');
check(Boolean(renderCurrentEntries), 'renderCurrentEntries() missing');
check(renderCurrentEntries.includes('const generation = ++renderGeneration;'), 'render-generation positive control missing');
check(renderCurrentEntries.includes('urlGroupPageBoundaries.set(currentPage + 1, {'), 'group continuation storage missing');
check(renderCurrentEntries.includes("key: String(last.key || ''), url: String(last.url || ''), latest: Number(last.latest || 0)"),
  'group continuation shape changed; refresh research');

// Fresh external-source and release-boundary provenance.
check(evidence.includes('https://www.w3.org/TR/IndexedDB/'), 'W3C IndexedDB source missing');
check(evidence.includes('https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction'), 'MDN IDBTransaction source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome MV3 lifecycle source missing');
check(evidence.includes('https://www.sqlite.org/pragma.html#pragma_data_version'), 'independent data-version comparison missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release hard fence missing');
check(evidence.includes('Production/runtime modification: **NONE**'), 'research-only runtime boundary missing');

// Current-shaped semantic witness: one UI generation can accept A metadata and B page,
// then adopt a later notification baseline without proving a single source snapshot.
function currentShapedLoad({ metaRevision, pageRevision, notificationRevision }) {
  return {
    generation: 1,
    metaRevision,
    pageRevision,
    baseline: notificationRevision,
    visibleMixed: metaRevision !== pageRevision
  };
}

{
  const view = currentShapedLoad({ metaRevision: 'A', pageRevision: 'B', notificationRevision: 'B' });
  check(view.visibleMixed, 'current-shaped mixed A/B view witness did not mix revisions');
  check(view.baseline === 'B', 'current-shaped baseline did not adopt newest notification');
  check(view.generation === 1, 'mixed-view witness incorrectly required a second UI generation');
}

// Target receipt model. Each component is labelled with the authoritative DB revision
// observed in the same conceptual read transaction.
function receipt(sourceRevision, result, queryIdentity = '') {
  return Object.freeze({ sourceRevision, result, queryIdentity });
}

function compose(metaReceipt, contentReceipt) {
  if (!metaReceipt?.sourceRevision || !contentReceipt?.sourceRevision) return { ok: false, reason: 'missing-revision' };
  if (metaReceipt.sourceRevision !== contentReceipt.sourceRevision) return { ok: false, reason: 'mixed-source-revision' };
  return { ok: true, sourceRevision: metaReceipt.sourceRevision };
}

function finalFence(composed, currentRevision) {
  if (!composed.ok) return composed;
  if (composed.sourceRevision !== currentRevision) return { ok: false, reason: 'stale-before-publish' };
  return { ok: true, sourceRevision: composed.sourceRevision };
}

// Mixed A/B components are rejected even though one UI generation could otherwise accept both.
{
  const meta = receipt('A', { counts: 10 }, 'meta');
  const page = receipt('B', [{ id: 'entry-b' }], 'page-1');
  const result = compose(meta, page);
  check(!result.ok && result.reason === 'mixed-source-revision', 'target composition accepted mixed A/B components');
}

// Same-revision direct/fallback transport parity is allowed.
{
  const directMeta = receipt('R1', { counts: 2 }, 'direct-meta');
  const fallbackPage = receipt('R1', [{ id: 'x' }], 'worker-page');
  const result = finalFence(compose(directMeta, fallbackPage), 'R1');
  check(result.ok && result.sourceRevision === 'R1', 'same-revision direct/fallback composition failed');
}

// A coherent R component set is still stale if the DB advanced before publication.
{
  const result = finalFence(compose(receipt('R1', {}, 'meta'), receipt('R1', [], 'page')), 'R2');
  check(!result.ok && result.reason === 'stale-before-publish', 'final DB-revision fence accepted stale coherent view');
}

// Baseline is the actually accepted source revision, never a newer revision that was not rendered.
{
  const accepted = finalFence(compose(receipt('R7', {}, 'meta'), receipt('R7', [], 'page')), 'R7');
  check(accepted.ok, 'coherent R7 view was unexpectedly rejected');
  const renderedBaseline = accepted.sourceRevision;
  const laterCurrent = 'R8';
  check(renderedBaseline === 'R7' && renderedBaseline !== laterCurrent,
    'rendered baseline was relabelled to a later unrendered source revision');
}

// Group continuation is valid only under the revision that produced its boundary.
function useContinuation(boundary, currentRevision) {
  if (!boundary?.sourceRevision || boundary.sourceRevision !== currentRevision) return 'stale-continuation';
  return 'usable';
}

{
  const boundary = { sourceRevision: 'A', key: 'k', url: 'u', latest: 10 };
  check(useContinuation(boundary, 'A') === 'usable', 'same-revision group continuation rejected');
  check(useContinuation(boundary, 'B') === 'stale-continuation', 'old group continuation survived source revision change');
}

// Group child expansion must match the rendered group revision.
function attachChildren(renderedGroupRevision, childReceipt) {
  return renderedGroupRevision === childReceipt.sourceRevision ? 'attached' : 'stale-children';
}

{
  check(attachChildren('A', receipt('A', [], 'children')) === 'attached', 'same-revision group children rejected');
  check(attachChildren('A', receipt('B', [], 'children')) === 'stale-children', 'mixed-revision group children attached');
}

// Numeric page meaning is likewise revision-bound.
function pageState(sourceRevision, page) {
  return { sourceRevision, page };
}

{
  const state = pageState('A', 2);
  check(state.sourceRevision === 'A' && state.page === 2, 'page-state setup failed');
  check(state.sourceRevision !== 'B', 'old page state incorrectly belongs to new revision');
}

// Bounded retry terminates under churn rather than spinning indefinitely.
function loadWithBoundedRevisionAttempts(sequence, maxAttempts) {
  const attempts = Math.min(sequence.length, maxAttempts);
  for (let i = 0; i < attempts; i += 1) {
    const [metaR, pageR, currentR] = sequence[i];
    const accepted = finalFence(compose(receipt(metaR, {}, 'meta'), receipt(pageR, [], 'page')), currentR);
    if (accepted.ok) return { ok: true, attempts: i + 1, sourceRevision: accepted.sourceRevision };
  }
  return { ok: false, attempts, reason: 'bounded-retry-exhausted' };
}

{
  const churn = [
    ['A', 'B', 'B'],
    ['B', 'B', 'C'],
    ['C', 'D', 'D'],
    ['D', 'D', 'E']
  ];
  const result = loadWithBoundedRevisionAttempts(churn, 3);
  check(!result.ok && result.attempts === 3 && result.reason === 'bounded-retry-exhausted',
    'coherence retry did not terminate at configured bound');
}

{
  const sequence = [
    ['A', 'B', 'B'],
    ['B', 'B', 'B']
  ];
  const result = loadWithBoundedRevisionAttempts(sequence, 3);
  check(result.ok && result.attempts === 2 && result.sourceRevision === 'B',
    'bounded retry did not accept first stable coherent revision');
}

if (failures.length) {
  console.error(`P1-206 composed-view revision refinement model: FAIL (${failures.length}/${cases})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-206 composed-view revision refinement model: PASS (${cases} checks, ${SCHEMA})`);
