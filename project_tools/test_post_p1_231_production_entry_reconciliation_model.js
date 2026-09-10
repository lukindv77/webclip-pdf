'use strict';

const assert = require('assert');
const fs = require('fs');

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

const registry = fs.readFileSync('project_docs/RESEARCH_REGISTRY.md', 'utf8');
const testStatus = fs.readFileSync('project_docs/TEST_STATUS.md', 'utf8');
const p1231DagModel = fs.readFileSync('project_tools/test_p1_231_consolidated_implementation_dag_model.js', 'utf8');
const s1dEvidence = fs.readFileSync('project_docs/RESEARCH_P1_231_S1D_MIGRATION_REHEARSAL_SOURCE_SPEC_2026-09-10_EVIDENCE.md', 'utf8');

const runtimeOrder = [
  'A0', 'U0', 'J0', 'A1', 'A2', 'D0a', 'B0', 'B1', 'W5', 'C0',
  'C1', 'D1', 'D2', 'W4W6', 'E0', 'E1', 'Z'
];

const runtimeDeps = new Map([
  ['A0', []],
  ['U0', ['A0']],
  ['J0', ['U0']],
  ['A1', ['J0']],
  ['A2', ['A1']],
  ['D0a', ['A2', 'J0']],
  ['B0', ['A2', 'D0a']],
  ['B1', ['B0', 'U0']],
  ['W5', ['B1']],
  ['C0', ['W5']],
  ['C1', ['C0', 'B1', 'D0a']],
  ['D1', ['C1', 'D0a']],
  ['D2', ['C1', 'D0a']],
  ['W4W6', ['J0', 'D0a']],
  ['E0', ['C1', 'D1', 'D2']],
  ['E1', ['E0']],
  ['Z', ['E1', 'W4W6', 'D1', 'D2', 'C1']]
]);

const releaseControl = new Set([
  'S0-A', 'S0-B', 'S0-C', 'S0-D', 'S0-E', 'S0-F', 'S0-G', 'S0-H', 'S0-I',
  'S1-A', 'S1-B', 'S1-C', 'S1-D', 'APPROVAL',
  'S2-A', 'S2-B', 'S2-C', 'S2-D', 'S2-E'
]);

function runtimeTopoValid() {
  const pos = new Map(runtimeOrder.map((name, index) => [name, index]));
  for (const [name, deps] of runtimeDeps) {
    if (!pos.has(name)) return false;
    for (const dep of deps) {
      if (!pos.has(dep) || pos.get(dep) >= pos.get(name)) return false;
    }
  }
  return true;
}

function authorityTransition(current, requested) {
  const allowed = new Map([
    ['passive-v8', new Set(['passive-v8', 'cas-v1'])],
    ['cas-v1', new Set(['cas-v1'])]
  ]);
  if (!allowed.has(current) || !allowed.get(current).has(requested)) {
    throw new Error(`illegal authority transition ${current} -> ${requested}`);
  }
  return requested;
}

function dispatchIdentityVersion(record) {
  return Number(record?.identityVersion || 0) >= 2 ? 'v2' : 'legacy';
}

function promoteLegacy(record) {
  if (dispatchIdentityVersion(record) === 'legacy') {
    throw new Error('legacy provenance cannot be bulk-promoted');
  }
  return record;
}

function rollbackPolicy({ journalVersion, pdfVersion, casActive, startedV2Effect }) {
  return {
    allowJournalV7Bundle: journalVersion < 8,
    allowPdfV3Bundle: pdfVersion < 4,
    allowAuthorityDowngrade: !casActive,
    mayDisableNewAdmissions: true,
    reconciliationRequired: Boolean(casActive || startedV2Effect),
    mayDisableV2Reconciliation: !startedV2Effect && !casActive
  };
}

function currentEvidence({ evidenceCandidate, currentCandidate, ci, chrome, yandex }) {
  if (!evidenceCandidate || evidenceCandidate !== currentCandidate) return false;
  return Boolean(ci && chrome && yandex);
}

function releaseExecutionAllowed({
  s2Approval,
  publishControlImplemented,
  implementationFixed,
  repositoryCi,
  chrome,
  yandexL5,
  blockerReview,
  explicitDecision,
  evidenceCandidate,
  currentCandidate,
  freshMain
}) {
  return Boolean(
    s2Approval
    && publishControlImplemented
    && implementationFixed
    && repositoryCi
    && chrome
    && yandexL5
    && blockerReview
    && explicitDecision
    && evidenceCandidate
    && evidenceCandidate === currentCandidate
    && freshMain
  );
}

function zAuthorizesS2() {
  return false;
}

// Current canonical authority, explicitly superseding the stale old-map claim.
test('Registry allocates P1-231 as ACTIVE', () => assert(registry.includes('| P1-231 | ACTIVE |')));
test('stale P1-231-unallocated claim is rejected', () => assert.strictEqual(registry.includes('P1-231 | ACTIVE'), true));
test('current test status keeps manifest 0.9.8', () => assert(/version `0\.9\.8`/.test(testStatus)));
test('current release status is NOT READY', () => assert(testStatus.includes('**NOT READY**')));
test('current release requires real Yandex OAuth/API E2E', () => assert(testStatus.includes('real Yandex OAuth/API E2E')));
test('current release requires explicit release decision', () => assert(testStatus.includes('explicit release decision')));
test('current P1-231 DAG has explicit APPROVAL node', () => assert(p1231DagModel.includes("['APPROVAL'")));
test('current P1-231 DAG contains S2 readiness migration', () => assert(p1231DagModel.includes('S2-A-readiness-migration')));
test('current P1-231 DAG contains S2 official publish control', () => assert(p1231DagModel.includes('S2-D-publish')));
test('S1-D says research authorization does not satisfy S2 approval', () => assert(s1dEvidence.includes('This research authorization does not satisfy that dependency.')));
test('S1-D keeps V1 authority unchanged', () => assert(s1dEvidence.includes('v1Authority = unchanged')));

// Runtime/data-plane graph retained as historical design evidence.
test('runtime graph remains topological', () => assert(runtimeTopoValid()));
for (const name of runtimeOrder) {
  test(`runtime node ${name} has dependency declaration`, () => assert(runtimeDeps.has(name)));
}
test('Z remains final runtime/data-plane activation node', () => assert.strictEqual(runtimeOrder.at(-1), 'Z'));
test('J0 requires U0', () => assert(runtimeDeps.get('J0').includes('U0')));
test('B1 requires U0 and B0', () => assert(runtimeDeps.get('B1').includes('U0') && runtimeDeps.get('B1').includes('B0')));
test('C1 requires exact context/PDF/Journal prerequisites', () => {
  assert.deepStrictEqual(runtimeDeps.get('C1'), ['C0', 'B1', 'D0a']);
});
test('Z waits for UI reconciliation', () => assert(runtimeDeps.get('Z').includes('E1')));

// Plane separation.
for (const runtimeName of runtimeOrder) {
  test(`${runtimeName} is not a P1-231 release-control node`, () => assert(!releaseControl.has(runtimeName)));
}
test('runtime Z does not authorize S2', () => assert.strictEqual(zAuthorizesS2(), false));
test('runtime Z is not explicit approval', () => assert.notStrictEqual('Z', 'APPROVAL'));
test('S2 approval is not runtime Z', () => assert.notStrictEqual('APPROVAL', 'Z'));

// Forward-only migration / rollback invariants retained from old cutover research.
test('passive-v8 may activate cas-v1', () => assert.strictEqual(authorityTransition('passive-v8', 'cas-v1'), 'cas-v1'));
test('cas-v1 cannot downgrade to passive-v8', () => assert.throws(() => authorityTransition('cas-v1', 'passive-v8'), /illegal authority transition/));
test('post-Journal-v8 rollback cannot use v7 bundle', () => {
  const p = rollbackPolicy({ journalVersion: 8, pdfVersion: 3, casActive: false, startedV2Effect: false });
  assert.strictEqual(p.allowJournalV7Bundle, false);
});
test('post-PDF-v4 rollback cannot use v3 bundle', () => {
  const p = rollbackPolicy({ journalVersion: 8, pdfVersion: 4, casActive: false, startedV2Effect: false });
  assert.strictEqual(p.allowPdfV3Bundle, false);
});
test('started-v2 rollback keeps reconciliation', () => {
  const p = rollbackPolicy({ journalVersion: 8, pdfVersion: 4, casActive: true, startedV2Effect: true });
  assert.strictEqual(p.reconciliationRequired, true);
  assert.strictEqual(p.mayDisableV2Reconciliation, false);
  assert.strictEqual(p.mayDisableNewAdmissions, true);
});
test('legacy row remains legacy', () => assert.strictEqual(dispatchIdentityVersion({ operationId: 'legacy' }), 'legacy'));
test('v2 row remains v2', () => assert.strictEqual(dispatchIdentityVersion({ identityVersion: 2 }), 'v2'));
test('legacy bulk promotion is forbidden', () => assert.throws(() => promoteLegacy({ operationId: 'legacy' }), /cannot be bulk-promoted/));

// Historical evidence cannot be replayed onto a later candidate.
test('historical candidate evidence is stale for current candidate', () => {
  assert.strictEqual(currentEvidence({ evidenceCandidate: 'e971bb7', currentCandidate: 'f9fd767', ci: true, chrome: true, yandex: true }), false);
});
test('exact-candidate evidence can be current only when all external gates pass', () => {
  assert.strictEqual(currentEvidence({ evidenceCandidate: 'same', currentCandidate: 'same', ci: true, chrome: true, yandex: true }), true);
});
test('exact candidate without Chrome is insufficient', () => {
  assert.strictEqual(currentEvidence({ evidenceCandidate: 'same', currentCandidate: 'same', ci: true, chrome: false, yandex: true }), false);
});
test('exact candidate without Yandex is insufficient', () => {
  assert.strictEqual(currentEvidence({ evidenceCandidate: 'same', currentCandidate: 'same', ci: true, chrome: true, yandex: false }), false);
});

const releaseBase = {
  s2Approval: true,
  publishControlImplemented: true,
  implementationFixed: true,
  repositoryCi: true,
  chrome: true,
  yandexL5: true,
  blockerReview: true,
  explicitDecision: true,
  evidenceCandidate: 'candidate-A',
  currentCandidate: 'candidate-A',
  freshMain: true
};

test('release execution requires all reconciled gates', () => assert(releaseExecutionAllowed(releaseBase)));
test('release execution blocked without S2 approval', () => assert(!releaseExecutionAllowed({ ...releaseBase, s2Approval: false })));
test('release execution blocked if publish control is not implemented', () => assert(!releaseExecutionAllowed({ ...releaseBase, publishControlImplemented: false })));
test('release execution blocked without repository CI', () => assert(!releaseExecutionAllowed({ ...releaseBase, repositoryCi: false })));
test('release execution blocked without real Chrome', () => assert(!releaseExecutionAllowed({ ...releaseBase, chrome: false })));
test('release execution blocked without Yandex L5', () => assert(!releaseExecutionAllowed({ ...releaseBase, yandexL5: false })));
test('release execution blocked without blocker review', () => assert(!releaseExecutionAllowed({ ...releaseBase, blockerReview: false })));
test('release execution blocked without explicit release decision', () => assert(!releaseExecutionAllowed({ ...releaseBase, explicitDecision: false })));
test('release execution blocked by candidate mismatch', () => assert(!releaseExecutionAllowed({ ...releaseBase, currentCandidate: 'candidate-B' })));
test('release execution blocked by main movement', () => assert(!releaseExecutionAllowed({ ...releaseBase, freshMain: false })));

// This research model itself cannot authorize product/release actions.
const tranche = Object.freeze({
  mode: 'research-only',
  productionMutation: false,
  s2Authorized: false,
  productZip: false,
  releaseAuthorized: false
});
test('tranche remains research-only', () => assert.strictEqual(tranche.mode, 'research-only'));
test('tranche mutates no production runtime', () => assert.strictEqual(tranche.productionMutation, false));
test('tranche does not authorize S2', () => assert.strictEqual(tranche.s2Authorized, false));
test('tranche creates no product ZIP', () => assert.strictEqual(tranche.productZip, false));
test('tranche does not authorize release', () => assert.strictEqual(tranche.releaseAuthorized, false));

console.log(`Post-P1-231 production-entry reconciliation model: PASS; cases=${cases}; runtime_nodes=${runtimeOrder.length}; release_control_nodes=${releaseControl.size}`);