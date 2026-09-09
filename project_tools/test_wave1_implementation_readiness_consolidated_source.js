'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const sw = read('service-worker.js');
const content = read('content.js');
const journal = read('journal.js');
const offscreen = read('offscreen.js');
const popup = read('popup.js');
const options = read('options.js');

function requireAny(text, patterns, message) {
  assert.ok(patterns.some((p) => p.test(text)), `RED: ${message}`);
}

// A0 / U0
assert.match(sw, /WebClipOperationReceipts|OPERATION_RECEIPT_DB_NAME/, 'A0 OperationReceipt DB absent');
assert.match(sw, /physicalOperationId/, 'worker-issued physical operation identity absent');
assert.match(sw, /clientRequestId/, 'exact client admission correlation absent');
assert.match(sw, /requestFingerprint/, 'immutable request fingerprint absent');
assert.match(sw, /WEBCLIP_WORKER_PROTOCOL_VERSION[^\n]*2|WORKER_PROTOCOL_VERSION[^\n]*2/, 'worker protocol v2 absent');
assert.match(content, /CONTENT_PROTOCOL_VERSION[^\n]*2|WEBCLIP_CONTENT_PROTOCOL_VERSION[^\n]*2/, 'content protocol v2 absent');
assert.match(offscreen, /OFFSCREEN_PROTOCOL_VERSION[^\n]*2|WEBCLIP_OFFSCREEN_PROTOCOL_VERSION[^\n]*2/, 'offscreen protocol v2 absent');

// J0
assert.match(sw, /JOURNAL_DB_VERSION\s*=\s*8/, 'worker still does not open Journal v8');
assert.match(journal, /JOURNAL_DB_VERSION\s*=\s*8/, 'Journal page still does not open Journal v8');
assert.match(sw, /journalFinalizations|JOURNAL_FINALIZATION_STORE/, 'Journal finalization store absent');
assert.match(sw, /pendingRemoteMutations|JOURNAL_PENDING_REMOTE_MUTATION_STORE/, 'remote mutation authority store absent');
assert.match(sw, /datasetGeneration|JOURNAL_DATASET_GENERATION/, 'Journal dataset generation absent');
requireAny(journal, [/schema-ready/i, /WEBCLIP_JOURNAL_SCHEMA_READY/], 'Journal page lacks worker-owned schema-ready handshake');

// A1/A2/B0/B1
assert.match(content, /documentActivityGeneration/, 'document activity generation absent');
assert.match(content, /selectionAuthorityId|SelectionAuthorityReceipt/, 'reviewed selection authority absent');
assert.match(sw, /sourceGenerationId/, 'exact source generation absent');
assert.match(sw, /renderAttemptId/, 'render attempt identity absent');
assert.match(sw, /Probe A|probeA|renderProbeA/i, 'render Probe A absent');
assert.match(sw, /Probe B|probeB|renderProbeB/i, 'render Probe B absent');
assert.match(sw, /Probe C|probeC|renderProbeC/i, 'render Probe C absent');
assert.match(sw, /pdfGenerationId/, 'immutable PDF generation identity absent');
assert.match(sw, /PDF_CACHE_DB_VERSION\s*=\s*4/, 'worker PDF cache is not v4');
assert.match(offscreen, /PDF_CACHE_DB_VERSION\s*=\s*4/, 'offscreen PDF cache is not v4');
requireAny(sw, [/retryIndex/, /PDF_CACHE_RETRY_INDEX_STORE/], 'PDF retry index absent');
assert.match(sw, /sha256/i, 'exact PDF digest authority absent');

// C0/C1
requireAny(sw, [/yandexContextId/i, /YandexOperationContext/], 'immutable Yandex operation context absent');
assert.match(sw, /authGeneration/i, 'auth generation absent');
assert.match(sw, /publicationPolicyGeneration/i, 'publication policy generation absent');
requireAny(sw, [/remoteEffectId/i, /RemoteEffectCheckpoint/], 'exact remote effect identity absent');
requireAny(sw, [/resourceId/i, /resource_id/i], 'exact provider object identity field absent');
assert.match(sw, /revision/i, 'remote/provider revision evidence absent');

// D0/D1/D2
requireAny(sw, [/JournalFinalizationIntent/, /finalizationIntentId/], 'early Journal finalization intent absent');
assert.match(sw, /entryRevision/i, 'per-entry revision absent');
requireAny(sw, [/canceled-before-start/, /CANCELED_BEFORE_START/], 'exact no-effect terminal state absent');
requireAny(sw, [/remote-complete-local-suppressed/, /LOCAL_SUPPRESSED/], 'partial finalization outcome absent');

// E0/E1
requireAny(sw, [/UserOperationReconcileResult/, /lookupResolution/], 'common reconciliation projection absent');
assert.match(sw, /retryDisposition/, 'explicit retry authority absent');
requireAny(sw, [/settled-partial/, /SETTLED_PARTIAL/], 'settled-partial result absent');
requireAny(content, [/clientRequestId/, /physicalOperationId/, /reconcile/i], 'content UI is not reconcile-aware');
requireAny(journal, [/clientRequestId/, /physicalOperationId/, /reconcile/i], 'Journal UI is not reconcile-aware');
requireAny(options, [/clientRequestId/, /physicalOperationId/, /reconcile/i], 'Options UI is not reconcile-aware');

// Z0 negative fallback checks. These are intentionally broad: any remaining
// legacy path must be explicitly classified/degraded rather than trusted v2.
assert.doesNotMatch(sw, /const\s+PDF_CACHE_DB_VERSION\s*=\s*3\s*;/, 'legacy PDF DB3 remains production default');
assert.doesNotMatch(journal, /const\s+JOURNAL_DB_VERSION\s*=\s*7\s*;/, 'legacy Journal v7 remains page default');
assert.doesNotMatch(sw, /const\s+JOURNAL_DB_VERSION\s*=\s*7\s*;/, 'legacy Journal v7 remains worker default');

console.log('Wave 1 consolidated implementation-readiness source gate: PASS');
