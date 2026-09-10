'use strict';

// Research-only deterministic model for the consolidated P1-231 S0/S1/S2 implementation DAG.
// It proves dependency ordering and policy-activation fences; it does not activate release behavior.

const assert = require('assert');

let cases = 0;
function check(name, fn) { fn(); cases += 1; return name; }

const nodes = new Map([
  ['S0-A-package-authority', { stage: 'S0', deps: [], owner: 'release-package-manifest', mutatesCanonicalPolicy: false }],
  ['S0-B-source-generation', { stage: 'S0', deps: ['S0-A-package-authority'], owner: 'source-generation-manifest', mutatesCanonicalPolicy: false }],
  ['S0-C-contract-projections', { stage: 'S0', deps: [], owner: 'release-contract-inputs', mutatesCanonicalPolicy: false }],
  ['S0-D-builder-contract', { stage: 'S0', deps: ['S0-A-package-authority'], owner: 'release-builder-contract', mutatesCanonicalPolicy: false }],
  ['S0-E-identity-engine', { stage: 'S0', deps: ['S0-A-package-authority', 'S0-C-contract-projections', 'S0-D-builder-contract'], owner: 'release-identity-engine', mutatesCanonicalPolicy: false }],
  ['S0-F-generation-gate', { stage: 'S0', deps: ['S0-A-package-authority', 'S0-B-source-generation', 'S0-E-identity-engine'], owner: 'candidate-generation-verifier', mutatesCanonicalPolicy: false }],
  ['S0-G-evidence-settlement', { stage: 'S0', deps: ['S0-E-identity-engine', 'S0-F-generation-gate'], owner: 'release-evidence-engine', mutatesCanonicalPolicy: false }],
  ['S0-H-passive-builder', { stage: 'S0', deps: ['S0-A-package-authority', 'S0-D-builder-contract', 'S0-E-identity-engine', 'S0-F-generation-gate'], owner: 'passive-builder-verifier', mutatesCanonicalPolicy: false }],
  ['S0-I-pr-checker-integration', { stage: 'S0', deps: ['S0-A-package-authority', 'S0-B-source-generation'], owner: 'pr-impact-checker', mutatesCanonicalPolicy: false }],
  ['S1-A-shadow-identity', { stage: 'S1', deps: ['S0-E-identity-engine', 'S0-F-generation-gate', 'S0-I-pr-checker-integration'], owner: 'repository-integrity-shadow', mutatesCanonicalPolicy: false }],
  ['S1-B-shadow-settlement', { stage: 'S1', deps: ['S0-G-evidence-settlement', 'S1-A-shadow-identity'], owner: 'shadow-evidence-report', mutatesCanonicalPolicy: false }],
  ['S1-C-builder-equivalence', { stage: 'S1', deps: ['S0-H-passive-builder', 'S1-A-shadow-identity'], owner: 'builder-equivalence-proof', mutatesCanonicalPolicy: false }],
  ['S1-D-migration-rehearsal', { stage: 'S1', deps: ['S1-A-shadow-identity', 'S1-B-shadow-settlement', 'S1-C-builder-equivalence'], owner: 'migration-negative-matrix', mutatesCanonicalPolicy: false }],
  ['APPROVAL', { stage: 'FENCE', deps: [], owner: 'explicit-user-policy-approval', mutatesCanonicalPolicy: false }],
  ['S2-A-readiness-migration', { stage: 'S2', deps: ['S1-D-migration-rehearsal', 'APPROVAL'], owner: 'canonical-readiness-authority', mutatesCanonicalPolicy: true }],
  ['S2-B-official-gate', { stage: 'S2', deps: ['S2-A-readiness-migration', 'APPROVAL'], owner: 'official-release-gate', mutatesCanonicalPolicy: true }],
  ['S2-C-official-artifact', { stage: 'S2', deps: ['S2-B-official-gate', 'S1-C-builder-equivalence', 'APPROVAL'], owner: 'official-artifact-builder', mutatesCanonicalPolicy: true }],
  ['S2-D-publish', { stage: 'S2', deps: ['S2-C-official-artifact', 'APPROVAL'], owner: 'official-publish-orchestrator', mutatesCanonicalPolicy: true }],
  ['S2-E-real-yandex-l5', { stage: 'S2', deps: ['S2-B-official-gate', 'APPROVAL'], owner: 'external-yandex-qualification', mutatesCanonicalPolicy: true }],
]);

function reachable(start, target) {
  const stack = [start];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (cur === target) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = nodes.get(cur);
    if (!node) continue;
    for (const dep of node.deps) stack.push(dep);
  }
  return false;
}

function topoSort() {
  const state = new Map();
  const out = [];
  function visit(name) {
    const s = state.get(name) || 0;
    if (s === 1) throw new Error(`cycle:${name}`);
    if (s === 2) return;
    state.set(name, 1);
    const node = nodes.get(name);
    assert(node, `unknown node: ${name}`);
    for (const dep of node.deps) {
      assert(nodes.has(dep), `unknown dependency ${dep} of ${name}`);
      visit(dep);
    }
    state.set(name, 2);
    out.push(name);
  }
  for (const name of nodes.keys()) visit(name);
  return out;
}

function requiresApproval(name) {
  return name === 'APPROVAL' ? true : reachable(name, 'APPROVAL');
}

function canTreatAsMachineEvidence({ typedReceiptValid, freeFormEvidence }) {
  if (typedReceiptValid) return true;
  if (freeFormEvidence) return false;
  return false;
}

const order = topoSort();
check('DAG is acyclic and covers every node', () => assert.strictEqual(order.length, nodes.size));
check('authority owners are unique', () => {
  const owners = [...nodes.values()].map((n) => n.owner);
  assert.strictEqual(new Set(owners).size, owners.length);
});
check('package authority precedes PR checker integration', () => assert(reachable('S0-I-pr-checker-integration', 'S0-A-package-authority')));
check('source-generation authority precedes PR checker integration', () => assert(reachable('S0-I-pr-checker-integration', 'S0-B-source-generation')));
check('PR checker cannot define package authority', () => assert(!reachable('S0-A-package-authority', 'S0-I-pr-checker-integration')));
check('source-generation authority precedes generation gate', () => assert(reachable('S0-F-generation-gate', 'S0-B-source-generation')));
check('identity engine precedes evidence settlement', () => assert(reachable('S0-G-evidence-settlement', 'S0-E-identity-engine')));
check('generation gate precedes evidence settlement', () => assert(reachable('S0-G-evidence-settlement', 'S0-F-generation-gate')));
check('builder contract precedes passive builder', () => assert(reachable('S0-H-passive-builder', 'S0-D-builder-contract')));
check('package authority precedes passive builder', () => assert(reachable('S0-H-passive-builder', 'S0-A-package-authority')));
check('shadow settlement waits for evidence engine', () => assert(reachable('S1-B-shadow-settlement', 'S0-G-evidence-settlement')));
check('readiness migration waits for complete S1 rehearsal', () => assert(reachable('S2-A-readiness-migration', 'S1-D-migration-rehearsal')));
check('official gate waits for readiness migration', () => assert(reachable('S2-B-official-gate', 'S2-A-readiness-migration')));
check('official artifact waits for official gate', () => assert(reachable('S2-C-official-artifact', 'S2-B-official-gate')));
check('publish waits for official artifact', () => assert(reachable('S2-D-publish', 'S2-C-official-artifact')));
check('publish transitively waits for evidence engine', () => assert(reachable('S2-D-publish', 'S0-G-evidence-settlement')));
check('publish transitively waits for builder contract', () => assert(reachable('S2-D-publish', 'S0-D-builder-contract')));
check('real Yandex L5 is not an S0/S1 node', () => assert.strictEqual(nodes.get('S2-E-real-yandex-l5').stage, 'S2'));
check('real Yandex L5 waits for official gate', () => assert(reachable('S2-E-real-yandex-l5', 'S2-B-official-gate')));

check('every S2 node depends on explicit approval', () => {
  for (const [name, node] of nodes) if (node.stage === 'S2') assert(requiresApproval(name), `${name} lacks approval fence`);
});
check('no S0 node depends on approval/policy activation', () => {
  for (const [name, node] of nodes) if (node.stage === 'S0') assert(!requiresApproval(name), `${name} incorrectly behind/through activation fence`);
});
check('no S1 node mutates canonical policy', () => {
  for (const [name, node] of nodes) if (node.stage === 'S1') assert.strictEqual(node.mutatesCanonicalPolicy, false, name);
});
check('no S0 node mutates canonical policy', () => {
  for (const [name, node] of nodes) if (node.stage === 'S0') assert.strictEqual(node.mutatesCanonicalPolicy, false, name);
});
check('all canonical-policy mutation nodes are S2', () => {
  for (const [name, node] of nodes) if (node.mutatesCanonicalPolicy) assert.strictEqual(node.stage, 'S2', name);
});

check('free-form V1 evidence is not new machine authority', () => assert.strictEqual(canTreatAsMachineEvidence({ typedReceiptValid: false, freeFormEvidence: 'legacy text' }), false));
check('valid typed receipt may become machine evidence after applicable migration', () => assert.strictEqual(canTreatAsMachineEvidence({ typedReceiptValid: true, freeFormEvidence: '' }), true));
check('missing evidence is not success', () => assert.strictEqual(canTreatAsMachineEvidence({ typedReceiptValid: false, freeFormEvidence: '' }), false));

const authorityKinds = new Map([
  ['package-membership', 'release-package-manifest'],
  ['source-generation', 'source-generation-manifest'],
  ['contract-projections', 'release-contract-inputs'],
  ['builder-contract', 'release-builder-contract'],
  ['identity-computation', 'release-identity-engine'],
  ['receipt-settlement', 'release-evidence-engine'],
  ['pr-impact', 'pr-impact-checker'],
]);
check('package membership and PR impact have distinct owners', () => assert.notStrictEqual(authorityKinds.get('package-membership'), authorityKinds.get('pr-impact')));
check('builder contract and logical identity computation have distinct owners', () => assert.notStrictEqual(authorityKinds.get('builder-contract'), authorityKinds.get('identity-computation')));
check('contract projection and receipt settlement have distinct owners', () => assert.notStrictEqual(authorityKinds.get('contract-projections'), authorityKinds.get('receipt-settlement')));

check('V1 readiness stays canonical before S2 migration', () => {
  const activeBeforeS2 = 'RELEASE_READINESS_V1';
  assert.strictEqual(activeBeforeS2, 'RELEASE_READINESS_V1');
  assert(requiresApproval('S2-A-readiness-migration'));
});
check('old V1 release gate stays canonical before S2 gate activation', () => {
  const activeGateBeforeS2 = 'release-gate-v1';
  assert.strictEqual(activeGateBeforeS2, 'release-gate-v1');
  assert(requiresApproval('S2-B-official-gate'));
});
check('shadow settlement cannot write readiness', () => assert.strictEqual(nodes.get('S1-B-shadow-settlement').mutatesCanonicalPolicy, false));
check('shadow builder cannot publish', () => assert.strictEqual(nodes.get('S0-H-passive-builder').mutatesCanonicalPolicy, false));
check('package manifest addition alone cannot activate official gate', () => assert(!reachable('S0-A-package-authority', 'S2-B-official-gate')));

console.log(`P1-231 consolidated implementation DAG model: PASS; cases=${cases}; nodes=${nodes.size}; s0=${[...nodes.values()].filter(n=>n.stage==='S0').length}; s1=${[...nodes.values()].filter(n=>n.stage==='S1').length}; s2=${[...nodes.values()].filter(n=>n.stage==='S2').length}`);
