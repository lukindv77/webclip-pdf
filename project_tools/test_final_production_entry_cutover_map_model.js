'use strict';

const assert = require('assert');

let cases = 0;
function test(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

const tranches = {
  A0: {
    deps: [],
    files: ['service-worker.js'],
    passive: true,
    schema: 'WebClipOperationReceipts v1',
    rollback: 'retain-schema-data'
  },
  U0: {
    deps: ['A0'],
    files: ['service-worker.js', 'content.js', 'journal.js', 'options.js', 'offscreen.js'],
    passive: true,
    schema: null,
    rollback: 'ordinary-before-dependent-schema'
  },
  J0: {
    deps: ['U0'],
    files: ['service-worker.js', 'journal.js'],
    passive: true,
    schema: 'WebClipJournal v8',
    rollback: 'forward-only-v8'
  },
  A1: {
    deps: ['J0'],
    files: ['content.js', 'popup.js', 'service-worker.js'],
    passive: true,
    schema: null,
    rollback: 'ordinary'
  },
  A2: {
    deps: ['A1'],
    files: ['service-worker.js', 'content.js', 'journal.js', 'options.js'],
    passive: false,
    schema: null,
    rollback: 'retain-operation-receipts'
  },
  D0a: {
    deps: ['A2', 'J0'],
    files: ['service-worker.js', 'journal.js'],
    passive: true,
    schema: null,
    rollback: 'keep-passive-v8'
  },
  B0: {
    deps: ['A2', 'D0a'],
    files: ['service-worker.js', 'content.js'],
    passive: true,
    schema: null,
    rollback: 'ordinary'
  },
  B1: {
    deps: ['B0', 'U0'],
    files: ['service-worker.js', 'offscreen.js'],
    passive: false,
    schema: 'WebClipPdfRetryCache v4',
    rollback: 'forward-only-v4'
  },
  W5: {
    deps: ['B1'],
    files: ['service-worker.js', 'options.js'],
    passive: true,
    schema: null,
    rollback: 'retain-generation-state'
  },
  C0: {
    deps: ['W5'],
    files: ['service-worker.js', 'options.js'],
    passive: true,
    schema: null,
    rollback: 'retain-generation-state'
  },
  C1: {
    deps: ['C0', 'B1', 'D0a'],
    files: ['service-worker.js', 'offscreen.js'],
    passive: true,
    schema: null,
    rollback: 'admission-off-reconcile-on'
  },
  D1: {
    deps: ['C1', 'D0a'],
    files: ['service-worker.js', 'journal.js'],
    passive: true,
    schema: null,
    rollback: 'admission-off-reconcile-on'
  },
  D2: {
    deps: ['C1', 'D0a'],
    files: ['service-worker.js'],
    passive: true,
    schema: null,
    rollback: 'admission-off-reconcile-on'
  },
  W4W6: {
    deps: ['J0', 'D0a'],
    files: ['service-worker.js', 'journal.js', 'journal-text-filter.js'],
    passive: true,
    schema: null,
    rollback: 'retain-v8-derived-generations'
  },
  E0: {
    deps: ['C1', 'D1', 'D2'],
    files: ['service-worker.js'],
    passive: true,
    schema: null,
    rollback: 'keep-readonly-reconcile'
  },
  E1: {
    deps: ['E0'],
    files: ['content.js', 'journal.js', 'options.js', 'popup.js', 'prepared-save-as.js'],
    passive: true,
    schema: null,
    rollback: 'keep-readonly-reconcile'
  },
  Z: {
    deps: ['E1', 'W4W6', 'D1', 'D2', 'C1'],
    files: ['service-worker.js', 'journal.js'],
    passive: false,
    schema: null,
    rollback: 'cas-v1-admission-off-reconcile-on'
  },
  CHROME: {
    deps: ['Z'],
    files: [],
    passive: false,
    schema: null,
    rollback: 'n/a'
  },
  L5: {
    deps: ['CHROME'],
    files: [],
    passive: false,
    schema: null,
    rollback: 'n/a'
  },
  RELEASE: {
    deps: ['L5'],
    files: [],
    passive: false,
    schema: null,
    rollback: 'n/a'
  }
};

const preferredOrder = [
  'A0', 'U0', 'J0', 'A1', 'A2', 'D0a', 'B0', 'B1', 'W5', 'C0',
  'C1', 'D1', 'D2', 'W4W6', 'E0', 'E1', 'Z', 'CHROME', 'L5', 'RELEASE'
];

function topoIndex(name) {
  return preferredOrder.indexOf(name);
}

function assertTopologicalOrder() {
  for (const [name, spec] of Object.entries(tranches)) {
    for (const dep of spec.deps) {
      assert(topoIndex(dep) >= 0, `missing dependency ${dep}`);
      assert(topoIndex(dep) < topoIndex(name), `${dep} must precede ${name}`);
    }
  }
}

function canRun(name, completed) {
  return tranches[name].deps.every((dep) => completed.has(dep));
}

function nextAuthorityMode(current, requested) {
  const allowed = new Map([
    ['passive-v8', new Set(['passive-v8', 'cas-v1'])],
    ['cas-v1', new Set(['cas-v1'])]
  ]);
  if (!allowed.has(current) || !allowed.get(current).has(requested)) {
    const error = new Error(`illegal authority transition ${current} -> ${requested}`);
    error.code = 'ILLEGAL_AUTHORITY_TRANSITION';
    throw error;
  }
  return requested;
}

function rollbackPolicy({ journalVersion, pdfVersion, casActive, hasStartedV2Effect }) {
  return {
    allowOldJournalV7Bundle: journalVersion < 8,
    allowOldPdfV3Bundle: pdfVersion < 4,
    allowAuthorityDowngrade: !casActive,
    allowDisableV2Reconciliation: !hasStartedV2Effect,
    newAdmissionsMayBeDisabled: true,
    reconciliationMustRemainEnabled: Boolean(hasStartedV2Effect || casActive)
  };
}

function dispatchReceipt(record) {
  const version = Number(record?.identityVersion || 0);
  if (version >= 2) return 'v2';
  return 'legacy';
}

function promoteLegacy(record) {
  if (dispatchReceipt(record) === 'legacy') {
    const error = new Error('legacy provenance cannot be bulk-promoted');
    error.code = 'LEGACY_PROMOTION_FORBIDDEN';
    throw error;
  }
  return record;
}

function effectAfterClear(phase) {
  if (phase === 'prepared') return 'canceled-before-start';
  if (phase === 'started-unknown') return 'started-unknown';
  if (phase === 'verified') return 'verified';
  return phase;
}

function reconcilePolicy({ v2AdmissionEnabled, phase }) {
  const active = ['started-unknown', 'verified', 'manual-resolution'].includes(phase);
  return {
    canAdmitNew: Boolean(v2AdmissionEnabled),
    canReconcileExisting: active || phase === 'prepared' || phase === 'local-finalized',
    mayBlindlyStartPrepared: false
  };
}

const journalWriterInventory = {
  ordinaryAppend: 'cas-or-generation-aware',
  recoveryAppend: 'cas-or-generation-aware',
  singleEntryDelete: 'cas-or-generation-aware',
  markRead: 'cas-or-generation-aware',
  commentHistoryMutation: 'cas-or-generation-aware',
  scopedClear: 'dataset-generation-rotation',
  fullImportReplace: 'dataset-generation-rotation',
  canonicalUrlMigration: 'generation-aware-resumable',
  derivedStatsPublication: 'derived-source-generation-bound',
  summaryPublication: 'derived-source-generation-bound',
  maintenanceEntriesMeta: 'cas-or-generation-aware'
};

function writerInventoryComplete(inventory) {
  const allowed = new Set([
    'cas-or-generation-aware',
    'dataset-generation-rotation',
    'generation-aware-resumable',
    'derived-source-generation-bound',
    'legacy-only-unreachable-for-v2'
  ]);
  return Object.values(inventory).every((value) => allowed.has(value));
}

function canActivateZ({ completed, writerInventory, protocolReady, legacyPromotionRequested }) {
  const depsReady = tranches.Z.deps.every((dep) => completed.has(dep));
  return depsReady
    && writerInventoryComplete(writerInventory)
    && protocolReady === true
    && legacyPromotionRequested !== true;
}

function migrationWorkLocation(kind) {
  const heavy = new Set(['legacy-url-backfill', 'urlStats-rebuild', 'journalSummaries-rebuild']);
  return heavy.has(kind) ? 'post-open-resumable' : 'versionchange-structural-only';
}

function packageAtomicValid(name, files) {
  const set = new Set(files);
  if (name === 'J0') return set.has('service-worker.js') && set.has('journal.js');
  if (name === 'B1') return set.has('service-worker.js') && set.has('offscreen.js');
  if (name === 'U0') return ['service-worker.js', 'content.js', 'journal.js', 'options.js', 'offscreen.js'].every((f) => set.has(f));
  if (name === 'Z') return set.has('service-worker.js') && set.has('journal.js');
  return true;
}

function protocolMutationAdmission({ protocolCompatible, senderTrusted, schemaReady }) {
  return Boolean(protocolCompatible && senderTrusted && schemaReady);
}

function remoteV2Admission({ p, f, pdf, context, authorityMode, defaultRouteEnabled }) {
  return Boolean(
    p && f && pdf?.sealed && pdf?.sha256 && context?.immutable
    && authorityMode === 'cas-v1'
    && defaultRouteEnabled
  );
}

function releaseReady({ implementation, repositoryCi, chrome, l5, blockerReview, explicitDecision }) {
  return Boolean(implementation && repositoryCi && chrome && l5 && blockerReview && explicitDecision);
}

// Graph and dependency evidence.
test('preferred graph is topological', assertTopologicalOrder);
for (const name of preferredOrder) {
  test(`${name} exists in graph`, () => assert(tranches[name]));
}
for (const [name, spec] of Object.entries(tranches)) {
  for (const dep of spec.deps) {
    test(`${name} dependency ${dep} is earlier`, () => assert(topoIndex(dep) < topoIndex(name)));
  }
}

// Sequential admission controls.
test('A0 can run first', () => assert(canRun('A0', new Set())));
test('U0 cannot run before A0', () => assert(!canRun('U0', new Set())));
test('J0 cannot run before U0', () => assert(!canRun('J0', new Set(['A0']))));
test('J0 can run after A0/U0', () => assert(canRun('J0', new Set(['A0', 'U0']))));
test('C1 cannot run without D0a', () => assert(!canRun('C1', new Set(['C0', 'B1']))));
test('C1 can run with B1/C0/D0a', () => assert(canRun('C1', new Set(['B1', 'C0', 'D0a']))));
test('Z cannot run before E1/W4W6/D1/D2/C1', () => assert(!canRun('Z', new Set(['C1', 'D1', 'D2', 'E1']))));

// Package-atomic boundaries.
for (const name of ['U0', 'J0', 'B1', 'Z']) {
  test(`${name} declared package is atomic-valid`, () => assert(packageAtomicValid(name, tranches[name].files)));
}
test('J0 partial worker-only package is invalid', () => assert(!packageAtomicValid('J0', ['service-worker.js'])));
test('B1 partial offscreen-only package is invalid', () => assert(!packageAtomicValid('B1', ['offscreen.js'])));
test('U0 missing offscreen peer is invalid', () => assert(!packageAtomicValid('U0', ['service-worker.js', 'content.js', 'journal.js', 'options.js'])));

// Schema boundaries and rollback.
test('J0 is Journal v8 cut', () => assert.strictEqual(tranches.J0.schema, 'WebClipJournal v8'));
test('B1 is PDF cache v4 cut', () => assert.strictEqual(tranches.B1.schema, 'WebClipPdfRetryCache v4'));
test('Z is not a schema migration', () => assert.strictEqual(tranches.Z.schema, null));
test('post-J0 rollback cannot use old v7 bundle', () => {
  const p = rollbackPolicy({ journalVersion: 8, pdfVersion: 3, casActive: false, hasStartedV2Effect: false });
  assert.strictEqual(p.allowOldJournalV7Bundle, false);
});
test('post-B1 rollback cannot use old v3 bundle', () => {
  const p = rollbackPolicy({ journalVersion: 8, pdfVersion: 4, casActive: false, hasStartedV2Effect: false });
  assert.strictEqual(p.allowOldPdfV3Bundle, false);
});
test('pre-schema state may still use old bundle compatibility', () => {
  const p = rollbackPolicy({ journalVersion: 7, pdfVersion: 3, casActive: false, hasStartedV2Effect: false });
  assert.strictEqual(p.allowOldJournalV7Bundle, true);
  assert.strictEqual(p.allowOldPdfV3Bundle, true);
});

// Authority monotonicity.
test('passive-v8 may remain passive', () => assert.strictEqual(nextAuthorityMode('passive-v8', 'passive-v8'), 'passive-v8'));
test('passive-v8 may activate cas-v1', () => assert.strictEqual(nextAuthorityMode('passive-v8', 'cas-v1'), 'cas-v1'));
test('cas-v1 may remain cas-v1', () => assert.strictEqual(nextAuthorityMode('cas-v1', 'cas-v1'), 'cas-v1'));
test('cas-v1 cannot downgrade to passive-v8', () => assert.throws(() => nextAuthorityMode('cas-v1', 'passive-v8'), /illegal authority transition/));

// Legacy/v2 dispatch.
test('legacy row remains legacy', () => assert.strictEqual(dispatchReceipt({ operationId: 'old' }), 'legacy'));
test('v2 row dispatches only to v2', () => assert.strictEqual(dispatchReceipt({ identityVersion: 2, physicalOperationId: 'P1' }), 'v2'));
test('legacy bulk promotion is forbidden', () => assert.throws(() => promoteLegacy({ operationId: 'old' }), /cannot be bulk-promoted/));
test('v2 receipt is already v2 and does not need promotion', () => {
  const row = { identityVersion: 2, physicalOperationId: 'P2' };
  assert.strictEqual(promoteLegacy(row), row);
});

// Effect-start/clear semantics.
test('clear before effect start cancels prepared exactly', () => assert.strictEqual(effectAfterClear('prepared'), 'canceled-before-start'));
test('clear after effect start preserves started-unknown', () => assert.strictEqual(effectAfterClear('started-unknown'), 'started-unknown'));
test('clear after remote verification preserves verified truth', () => assert.strictEqual(effectAfterClear('verified'), 'verified'));

// Rollback must retain reconciliation.
test('started effect rollback keeps reconciliation enabled', () => {
  const p = rollbackPolicy({ journalVersion: 8, pdfVersion: 4, casActive: true, hasStartedV2Effect: true });
  assert.strictEqual(p.reconciliationMustRemainEnabled, true);
  assert.strictEqual(p.allowDisableV2Reconciliation, false);
  assert.strictEqual(p.newAdmissionsMayBeDisabled, true);
});
test('admission-off mode still reconciles started-unknown', () => {
  const p = reconcilePolicy({ v2AdmissionEnabled: false, phase: 'started-unknown' });
  assert.strictEqual(p.canAdmitNew, false);
  assert.strictEqual(p.canReconcileExisting, true);
  assert.strictEqual(p.mayBlindlyStartPrepared, false);
});
test('generic reconciliation does not blindly start prepared', () => {
  const p = reconcilePolicy({ v2AdmissionEnabled: true, phase: 'prepared' });
  assert.strictEqual(p.canReconcileExisting, true);
  assert.strictEqual(p.mayBlindlyStartPrepared, false);
});

// Writer coverage.
test('declared Journal writer inventory is complete', () => assert(writerInventoryComplete(journalWriterInventory)));
for (const [writer, classification] of Object.entries(journalWriterInventory)) {
  test(`${writer} has accepted writer classification`, () => assert(classification));
}
test('unknown writer classification blocks activation', () => {
  const broken = { ...journalWriterInventory, hiddenWriter: 'unknown' };
  assert.strictEqual(writerInventoryComplete(broken), false);
});

// Z activation.
const zCompleted = new Set(['C1', 'D1', 'D2', 'W4W6', 'E0', 'E1']);
test('Z activates only with complete writers/protocol/no legacy promotion', () => {
  assert.strictEqual(canActivateZ({ completed: zCompleted, writerInventory: journalWriterInventory, protocolReady: true, legacyPromotionRequested: false }), true);
});
test('Z blocked by stale protocol', () => {
  assert.strictEqual(canActivateZ({ completed: zCompleted, writerInventory: journalWriterInventory, protocolReady: false, legacyPromotionRequested: false }), false);
});
test('Z blocked by legacy promotion request', () => {
  assert.strictEqual(canActivateZ({ completed: zCompleted, writerInventory: journalWriterInventory, protocolReady: true, legacyPromotionRequested: true }), false);
});
test('Z blocked by missing W4W6', () => {
  const incomplete = new Set(['C1', 'D1', 'D2', 'E0', 'E1']);
  assert.strictEqual(canActivateZ({ completed: incomplete, writerInventory: journalWriterInventory, protocolReady: true, legacyPromotionRequested: false }), false);
});

// Migration placement.
for (const kind of ['legacy-url-backfill', 'urlStats-rebuild', 'journalSummaries-rebuild']) {
  test(`${kind} is post-open resumable`, () => assert.strictEqual(migrationWorkLocation(kind), 'post-open-resumable'));
}
test('structural store creation belongs to versionchange only', () => assert.strictEqual(migrationWorkLocation('create-stores-indexes'), 'versionchange-structural-only'));

// Protocol fencing.
test('compatible trusted schema-ready mutation is admitted', () => assert(protocolMutationAdmission({ protocolCompatible: true, senderTrusted: true, schemaReady: true })));
test('stale protocol mutation is rejected', () => assert(!protocolMutationAdmission({ protocolCompatible: false, senderTrusted: true, schemaReady: true })));
test('untrusted sender mutation is rejected', () => assert(!protocolMutationAdmission({ protocolCompatible: true, senderTrusted: false, schemaReady: true })));
test('schema-not-ready mutation is rejected', () => assert(!protocolMutationAdmission({ protocolCompatible: true, senderTrusted: true, schemaReady: false })));

// Remote v2 must not outrun final activation.
const exactPdf = { sealed: true, sha256: 'abc' };
const immutableContext = { immutable: true };
test('remote v2 default cannot start in passive-v8', () => assert(!remoteV2Admission({ p: true, f: true, pdf: exactPdf, context: immutableContext, authorityMode: 'passive-v8', defaultRouteEnabled: true })));
test('remote v2 default cannot start before route activation', () => assert(!remoteV2Admission({ p: true, f: true, pdf: exactPdf, context: immutableContext, authorityMode: 'cas-v1', defaultRouteEnabled: false })));
test('remote v2 default requires F', () => assert(!remoteV2Admission({ p: true, f: false, pdf: exactPdf, context: immutableContext, authorityMode: 'cas-v1', defaultRouteEnabled: true })));
test('remote v2 default requires sealed exact PDF', () => assert(!remoteV2Admission({ p: true, f: true, pdf: { sealed: false, sha256: 'abc' }, context: immutableContext, authorityMode: 'cas-v1', defaultRouteEnabled: true })));
test('remote v2 default requires immutable context', () => assert(!remoteV2Admission({ p: true, f: true, pdf: exactPdf, context: { immutable: false }, authorityMode: 'cas-v1', defaultRouteEnabled: true })));
test('remote v2 default is admitted only after all local prerequisites', () => assert(remoteV2Admission({ p: true, f: true, pdf: exactPdf, context: immutableContext, authorityMode: 'cas-v1', defaultRouteEnabled: true })));

// External and release gates.
test('Chrome acceptance requires Z by graph', () => assert(tranches.CHROME.deps.includes('Z')));
test('L5 requires Chrome by graph', () => assert(tranches.L5.deps.includes('CHROME')));
test('release requires L5 by graph', () => assert(tranches.RELEASE.deps.includes('L5')));
test('release is false without L5', () => assert(!releaseReady({ implementation: true, repositoryCi: true, chrome: true, l5: false, blockerReview: true, explicitDecision: true })));
test('release is false without explicit decision', () => assert(!releaseReady({ implementation: true, repositoryCi: true, chrome: true, l5: true, blockerReview: true, explicitDecision: false })));
test('release is false without blocker review', () => assert(!releaseReady({ implementation: true, repositoryCi: true, chrome: true, l5: true, blockerReview: false, explicitDecision: true })));
test('release is true only with all gates', () => assert(releaseReady({ implementation: true, repositoryCi: true, chrome: true, l5: true, blockerReview: true, explicitDecision: true })));

console.log(`Final production-entry cutover map model: PASS; cases=${cases}`);
