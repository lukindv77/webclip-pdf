'use strict';

const assert = require('node:assert/strict');

const commits = Object.freeze({
  A0: {
    title: 'passive operation receipt primitives',
    deps: [],
    files: ['service-worker.js'],
    atomicGroup: 'independent',
    activates: [],
    guarantees: ['receipt-db-v1', 'identity-schema-v2-passive', 'no-runtime-retarget']
  },
  A1: {
    title: 'additive content protocol and exact injection handshake',
    deps: ['A0'],
    files: ['content.js', 'popup.js', 'service-worker.js'],
    atomicGroup: 'content-protocol',
    activates: [],
    guarantees: ['content-protocol-version', 'document-id-start-binding', 'exact-probe-passive']
  },
  A2: {
    title: 'worker-issued physical admission and compatibility progress',
    deps: ['A0', 'A1'],
    files: ['service-worker.js', 'content.js', 'journal.js', 'options.js'],
    atomicGroup: 'identity-activation',
    activates: ['physical-operation-v2'],
    guarantees: ['physical-operation-id', 'client-request-id', 'client-correlation-id', 'operationlog-physical-key', 'legacy-alias-only']
  },
  B0: {
    title: 'exact source render fence and one-pass digest result',
    deps: ['A2'],
    files: ['service-worker.js', 'content.js'],
    atomicGroup: 'source-render',
    activates: ['trusted-source-receipt'],
    guarantees: ['probe-a-b-c', 'render-attempt-id', 'source-generation-id', 'pdf-n-h']
  },
  B1: {
    title: 'pdf cache v4 immutable generations',
    deps: ['A2', 'B0'],
    files: ['service-worker.js', 'offscreen.js'],
    atomicGroup: 'pdf-db-v4',
    activates: ['trusted-pdf-generation'],
    guarantees: ['pdf-db-v4-both-openers', 'retry-index', 'create-once-add', 'legacy-unbound', 'g-n-h-offscreen-validation']
  },
  C0: {
    title: 'Yandex immutable operation context and publication generations',
    deps: ['A2'],
    files: ['service-worker.js', 'options.js'],
    atomicGroup: 'yandex-context',
    activates: ['yandex-context-v2'],
    guarantees: ['auth-generation', 'config-generation', 'account-root-scope', 'publication-generation', 'no-token-persistence-in-receipt']
  },
  C1: {
    title: 'remote V2 checkpoint and exact content verification',
    deps: ['B1', 'C0'],
    files: ['service-worker.js', 'offscreen.js'],
    atomicGroup: 'remote-content',
    activates: ['remote-content-v2'],
    guarantees: ['remote-checkpoint-v2', 'exact-sha256-verification', 'immutable-yandex-context-ref', 'publication-phase']
  },
  D0: {
    title: 'Journal generation CAS and operation-linked finalization',
    deps: ['A2'],
    files: ['service-worker.js', 'journal.js'],
    atomicGroup: 'journal-cas',
    activates: ['journal-finalization-v2'],
    guarantees: ['expected-journal-generation', 'entry-revision-cas', 'live-local-operation-link']
  },
  D1: {
    title: 'destructive move receipts for delete and Mark Read',
    deps: ['A2', 'C0', 'D0'],
    files: ['service-worker.js', 'journal.js'],
    atomicGroup: 'journal-remote-moves',
    activates: ['destructive-domain-v2'],
    guarantees: ['delete-move-receipt', 'mark-read-move-receipt', 'resource-identity', 'no-path-size-substitute']
  },
  D2: {
    title: 'save finalization composition',
    deps: ['C1', 'D0'],
    files: ['service-worker.js'],
    atomicGroup: 'save-finalization',
    activates: ['save-end-to-end-v2'],
    guarantees: ['remote-content-plus-publication-plus-journal-cas']
  },
  E0: {
    title: 'unified read-only reconciliation projection',
    deps: ['A2', 'B1', 'C1', 'D0', 'D1'],
    files: ['service-worker.js'],
    atomicGroup: 'reconcile-core',
    activates: ['reconcile-api-v1'],
    guarantees: ['lookup-resolution', 'operation-class', 'retry-disposition', 'ambiguous-fail-closed']
  },
  E1: {
    title: 'user UI reconciliation cutover',
    deps: ['E0', 'D2'],
    files: ['content.js', 'journal.js', 'options.js', 'prepared-save-as.js'],
    atomicGroup: 'ui-reconcile',
    activates: ['ui-reconcile-v1'],
    guarantees: ['no-transport-false-negative', 'no-blind-retry', 'same-operation-resume']
  },
  U0: {
    title: 'durable extension-page/content/offscreen protocol repair',
    deps: ['A0'],
    files: ['service-worker.js', 'content.js', 'journal.js', 'options.js', 'offscreen.js'],
    atomicGroup: 'update-protocol',
    activates: ['bundle-protocol-fencing'],
    guarantees: ['page-protocol-ack', 'content-protocol-ack', 'offscreen-protocol-ack', 'p1-209-pending-completed-repair']
  },
  Z0: {
    title: 'Wave 1 activation/closure sweep',
    deps: ['B1', 'C1', 'D2', 'E1', 'U0'],
    files: ['service-worker.js', 'content.js', 'journal.js', 'options.js', 'offscreen.js', 'popup.js', 'prepared-save-as.js'],
    atomicGroup: 'closure',
    activates: ['wave1-trusted-default'],
    guarantees: ['legacy-fail-closed', 'restart-schedules', 'update-schedules', 'physical-chrome-regression']
  }
});

function topoOrder(graph) {
  const out = [];
  const visited = new Set();
  const active = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    assert.ok(graph[id], `unknown node ${id}`);
    assert.ok(!active.has(id), `cycle at ${id}`);
    active.add(id);
    for (const dep of graph[id].deps) visit(dep);
    active.delete(id);
    visited.add(id);
    out.push(id);
  }
  for (const id of Object.keys(graph)) visit(id);
  return out;
}

const order = topoOrder(commits);
assert.equal(new Set(order).size, Object.keys(commits).length);

function before(a, b) {
  assert.ok(order.indexOf(a) >= 0 && order.indexOf(b) >= 0);
  return order.indexOf(a) < order.indexOf(b);
}

for (const [id, node] of Object.entries(commits)) {
  for (const dep of node.deps) assert.ok(before(dep, id), `${dep} must precede ${id}`);
}

assert.ok(before('A2', 'B0'));
assert.ok(before('A2', 'B1'));
assert.ok(before('B0', 'B1'));
assert.ok(before('B1', 'C1'));
assert.ok(before('C0', 'C1'));
assert.ok(before('C1', 'D2'));
assert.ok(before('D0', 'D2'));
assert.ok(before('E0', 'E1'));
assert.ok(before('E1', 'Z0'));
assert.ok(before('U0', 'Z0'));

assert.deepEqual([...commits.B1.files].sort(), ['offscreen.js', 'service-worker.js']);
assert.equal(commits.B1.atomicGroup, 'pdf-db-v4');

const databasePlan = Object.freeze({
  WebClipOperationReceipts: { from: 0, to: 1, sharedOpeners: ['service-worker.js'], bump: true },
  WebClipPdfRetryCache: { from: 3, to: 4, sharedOpeners: ['service-worker.js', 'offscreen.js'], bump: true },
  WebClipJournal: { from: 7, to: 7, sharedOpeners: ['service-worker.js', 'journal.js'], bump: false },
  WebClipOperationLogs: { from: 2, to: 2, sharedOpeners: ['service-worker.js'], bump: false },
  WebClipOffscreenTransfers: { from: 1, to: 1, sharedOpeners: ['service-worker.js', 'offscreen.js'], bump: false }
});
assert.equal(databasePlan.WebClipPdfRetryCache.to, 4);
assert.equal(databasePlan.WebClipJournal.to, 7);
assert.equal(databasePlan.WebClipOperationLogs.to, 2);
assert.deepEqual(databasePlan.WebClipPdfRetryCache.sharedOpeners.sort(), ['offscreen.js', 'service-worker.js']);

const trustLevels = Object.freeze([
  'legacy-compat',
  'v2-passive',
  'v2-identity',
  'v2-source-trusted',
  'v2-pdf-trusted',
  'v2-remote-trusted',
  'v2-finalized',
  'v2-ui-reconciled',
  'wave1-trusted-default'
]);
function trustRank(value) { return trustLevels.indexOf(value); }
assert.ok(trustRank('v2-passive') < trustRank('v2-identity'));
assert.ok(trustRank('v2-identity') < trustRank('v2-pdf-trusted'));
assert.ok(trustRank('v2-pdf-trusted') < trustRank('v2-remote-trusted'));

function classifyLegacyArtifact(artifact) {
  if (artifact.kind === 'pdf-cache-v3') return 'legacy-unbound';
  if (artifact.kind === 'remote-size-only') return 'legacy-unverified';
  if (artifact.kind === 'operation-id-only') return 'legacy-conflated';
  if (artifact.kind === 'mark-read-checkpoint-v1') return 'legacy-domain-checkpoint';
  if (artifact.kind === 'local-download-exact-id') return 'legacy-domain-exact';
  if (artifact.kind === 'save-as-session') return 'legacy-domain-session';
  if (artifact.kind === 'p1-215-import-receipt') return 'existing-exact-domain-receipt';
  return 'unknown';
}
assert.equal(classifyLegacyArtifact({kind:'pdf-cache-v3'}), 'legacy-unbound');
assert.equal(classifyLegacyArtifact({kind:'remote-size-only'}), 'legacy-unverified');
assert.equal(classifyLegacyArtifact({kind:'operation-id-only'}), 'legacy-conflated');
assert.equal(classifyLegacyArtifact({kind:'p1-215-import-receipt'}), 'existing-exact-domain-receipt');

function mayPromoteLegacy(kind) {
  return classifyLegacyArtifact({kind}) === 'existing-exact-domain-receipt';
}
for (const kind of ['pdf-cache-v3','remote-size-only','operation-id-only','mark-read-checkpoint-v1']) {
  assert.equal(mayPromoteLegacy(kind), false, `${kind} must not be promoted to Wave1 authority`);
}
assert.equal(mayPromoteLegacy('p1-215-import-receipt'), true);

const protocol = Object.freeze({ worker: 2, content: 2, offscreen: 2, extensionPage: 2, pdfDb: 4 });
function handshake(actual, expected) {
  if (!actual) return { ok: false, action: 'fail-closed', reason: 'missing-handshake' };
  if (actual.protocolVersion !== expected.protocolVersion) return { ok: false, action: 'fail-closed', reason: 'protocol-mismatch' };
  if (expected.pdfDbVersion != null && actual.pdfDbVersion !== expected.pdfDbVersion) return { ok: false, action: 'close-or-block', reason: 'pdf-db-mismatch' };
  return { ok: true, action: 'continue' };
}
assert.equal(handshake({protocolVersion:1},{protocolVersion:2}).ok, false);
assert.equal(handshake({protocolVersion:2,pdfDbVersion:3},{protocolVersion:2,pdfDbVersion:4}).action, 'close-or-block');
assert.equal(handshake({protocolVersion:2,pdfDbVersion:4},{protocolVersion:2,pdfDbVersion:4}).ok, true);

function offscreenMismatchPolicy({activeTransfer, settlementUnknown}) {
  if (activeTransfer || settlementUnknown) return 'block-new-work-and-reconcile';
  return 'close-stale-and-recreate';
}
assert.equal(offscreenMismatchPolicy({activeTransfer:true, settlementUnknown:false}), 'block-new-work-and-reconcile');
assert.equal(offscreenMismatchPolicy({activeTransfer:false, settlementUnknown:false}), 'close-stale-and-recreate');

function pageMismatchPolicy({pageKind, activeMutation}) {
  if (activeMutation) return 'freeze-mutation-ui-and-reconcile';
  if (pageKind === 'content') return 'require-new-review-after-exact-reinjection';
  return 'reload-and-ack-new-protocol';
}
assert.equal(pageMismatchPolicy({pageKind:'content',activeMutation:false}), 'require-new-review-after-exact-reinjection');
assert.equal(pageMismatchPolicy({pageKind:'journal',activeMutation:true}), 'freeze-mutation-ui-and-reconcile');

const atomicLandingRules = [
  ['B1', ['service-worker.js','offscreen.js']],
  ['A2', ['service-worker.js','content.js','journal.js','options.js']],
  ['E1', ['content.js','journal.js','options.js','prepared-save-as.js']]
];
for (const [id, required] of atomicLandingRules) {
  for (const file of required) assert.ok(commits[id].files.includes(file), `${id} must include ${file}`);
}

function buildState(completed) {
  const s = new Set(completed);
  const has = (id) => s.has(id);
  let trust = 'legacy-compat';
  if (has('A0')) trust = 'v2-passive';
  if (has('A2')) trust = 'v2-identity';
  if (has('B0')) trust = 'v2-source-trusted';
  if (has('B1')) trust = 'v2-pdf-trusted';
  if (has('C1')) trust = 'v2-remote-trusted';
  if (has('D2')) trust = 'v2-finalized';
  if (has('E1')) trust = 'v2-ui-reconciled';
  if (has('Z0')) trust = 'wave1-trusted-default';
  return trust;
}
assert.equal(buildState(['A0','A1']), 'v2-passive');
assert.equal(buildState(['A0','A1','A2']), 'v2-identity');
assert.equal(buildState(['A0','A1','A2','B0','B1']), 'v2-pdf-trusted');
assert.equal(buildState(order), 'wave1-trusted-default');

const schedules = [
  {name:'old content meets new worker', expected:'review-required'},
  {name:'old offscreen meets pdf-v4 worker, idle', expected:'close-stale-and-recreate'},
  {name:'old offscreen meets pdf-v4 worker, transfer unknown', expected:'block-new-work-and-reconcile'},
  {name:'legacy tab cache after update', expected:'legacy-unbound'},
  {name:'legacy remote size-only checkpoint after update', expected:'legacy-unverified'},
  {name:'existing P1-215 staged import after update', expected:'preserve-domain-authority'},
  {name:'exact local DownloadItem checkpoint after update', expected:'preserve-domain-authority'},
  {name:'prepared SaveAs session after update', expected:'preserve-session-authority-but-common-identity-legacy'},
  {name:'OperationLog cleared during unresolved operation', expected:'functional-receipt-survives'},
  {name:'new page protocol mismatch', expected:'reload-or-fail-closed'},
  {name:'worker restart after physical admission', expected:'recover-from-operation-receipt'},
  {name:'worker restart after upload admission', expected:'domain-reconcile-no-new-upload'}
];
assert.equal(schedules.length, 12);

const closureGates = Object.freeze([
  'syntax-all-js',
  'wave1-admission-model',
  'wave1-operation-context-model',
  'wave1-reconciliation-model',
  'wave1-staged-plan-model',
  'p0-079-v4-source-gate',
  'save-admission-source-gate',
  'operation-context-source-gate',
  'reconciliation-source-gate',
  'chrome-update-protocol-schedule',
  'chrome-pdf-physical-schedule',
  'local-download-physical-schedule',
  'yandex-l5-external-schedule'
]);
assert.ok(closureGates.includes('yandex-l5-external-schedule'));
assert.ok(closureGates.indexOf('yandex-l5-external-schedule') > closureGates.indexOf('reconciliation-source-gate'));

console.log('Wave 1 staged implementation plan model: PASS');
console.log(`commits=${Object.keys(commits).length}`);
console.log(`updateSchedules=${schedules.length}`);
console.log(`closureGates=${closureGates.length}`);
console.log(`topology=${order.join('>')}`);
