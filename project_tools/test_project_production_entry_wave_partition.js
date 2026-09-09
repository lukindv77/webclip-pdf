'use strict';

const assert = require('node:assert/strict');

const ACTIVE_P0 = [4,13,22,23,45,50,66,69,70,72,73,74,75,76,78,79,80];
const ACTIVE_P1 = [
  1,3,4,8,9,35,43,64,76,86,90,124,125,130,138,146,150,154,156,157,158,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,182,183,184,185,186,187,188,189,190,191,192,193,194,
  195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,214,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230
];

const waves = {
  W1: {
    name: 'Exact operation/artifact/side-effect authority',
    p0: [23,70,72,73,74,76,78,79,80],
    p1: [76,86,90,125,146,179,183,184,194,198,207,210]
  },
  W2: {
    name: 'Browser/extension lifecycle and control-plane settlement',
    p0: [],
    p1: [4,124,130,156,157,169,171,175,193,199,200,201,203,204,209,214,217,222,223,227]
  },
  W3: {
    name: 'Selection/PDF fidelity and frame representation',
    p0: [4],
    p1: [1,3,150,154,187,212,218,219,220,221,224,226,228,229,230]
  },
  W4: {
    name: 'Journal/portable-data/history integrity',
    p0: [13,50],
    p1: [8,185,186,188,189,190,197,202,205,206,211,216,225]
  },
  W5: {
    name: 'Security/privacy/auth/public-link governance',
    p0: [22,45,66,69,75],
    p1: [138,161,164,165,172,176,177,178,180,182,191,195,196]
  },
  W6: {
    name: 'Scale/fairness/bounded resource use',
    p0: [],
    p1: [9,35,43,64,158,160,162,163,166,167,168,170,173,174,192,208]
  }
};

function checkPartition(expected, assigned, label) {
  const seen = new Map();
  for (const id of assigned) seen.set(id, (seen.get(id) || 0) + 1);
  const duplicates = [...seen].filter(([, n]) => n > 1).map(([id]) => id).sort((a,b) => a-b);
  const missing = expected.filter((id) => !seen.has(id));
  const extras = [...seen.keys()].filter((id) => !expected.includes(id)).sort((a,b) => a-b);
  assert.deepEqual(duplicates, [], `${label}: duplicate primary assignments`);
  assert.deepEqual(missing, [], `${label}: missing active owners`);
  assert.deepEqual(extras, [], `${label}: non-active owners assigned`);
}

const assignedP0 = Object.values(waves).flatMap((w) => w.p0);
const assignedP1 = Object.values(waves).flatMap((w) => w.p1);
checkPartition(ACTIVE_P0, assignedP0, 'P0');
checkPartition(ACTIVE_P1, assignedP1, 'P1');

assert.equal(ACTIVE_P0.length, 17);
assert.equal(ACTIVE_P1.length, 89);
assert.equal(ACTIVE_P0.length + ACTIVE_P1.length, 106);
assert.deepEqual(Object.fromEntries(Object.entries(waves).map(([k,w]) => [k, w.p0.length + w.p1.length])), {
  W1: 21, W2: 20, W3: 16, W4: 15, W5: 18, W6: 16
});

// Program dependencies are not a total order. The hard spine is separated
// from parallel/supporting branches so one theme does not become a false
// dependency for unrelated owners.
const hardDeps = [
  ['W1-foundation', 'W1-remote-journal'],
  ['W1-foundation', 'W2-browser-lifecycle'],
  ['W1-foundation', 'W4-journal-integrity'],
  ['W2-frame-lifecycle', 'W3-cross-frame-fidelity'],
  ['W5-auth-core', 'W1-remote-journal'],
  ['W1-journal-generation', 'W4-journal-integrity'],
  ['W1-domain-receipts', 'W1-reconciliation']
];

const nodes = new Set(hardDeps.flat());
const outgoing = new Map([...nodes].map((n) => [n, []]));
const indegree = new Map([...nodes].map((n) => [n, 0]));
for (const [a,b] of hardDeps) {
  outgoing.get(a).push(b);
  indegree.set(b, indegree.get(b) + 1);
}
const queue = [...nodes].filter((n) => indegree.get(n) === 0);
let visited = 0;
while (queue.length) {
  const n = queue.shift();
  visited += 1;
  for (const m of outgoing.get(n)) {
    indegree.set(m, indegree.get(m) - 1);
    if (indegree.get(m) === 0) queue.push(m);
  }
}
assert.equal(visited, nodes.size, 'hard dependency graph must be acyclic');

// Cross-wave support slices: primary ownership stays unique, but the final
// closure of a consumer may depend on these supporting owners.
const support = {
  W1_remote_requires_W5_auth: ['P1-165','P1-178','P1-191','P1-195','P1-196'],
  W3_cross_frame_requires_W2_lifecycle: ['P1-171','P1-199','P1-200','P1-201','P1-203','P1-214','P1-227'],
  W4_journal_requires_W1_generation: ['P0-076','P0-072','P1-207','P1-210'],
  W6_is_closure_support_not_authority_substitute: ['P1-043','P1-166','P1-173','P1-192','P1-208']
};
for (const [name, ids] of Object.entries(support)) {
  assert.ok(ids.length > 0, `${name}: empty support slice`);
}

// Research/release boundaries stay distinct.
const state = {
  researchCoverageComplete: true,
  yandexL5DeferredToFinalStage: true,
  implementationClosureComplete: false,
  releaseReady: false,
  newP1231Allocated: false
};
assert.equal(state.researchCoverageComplete, true);
assert.equal(state.yandexL5DeferredToFinalStage, true);
assert.equal(state.implementationClosureComplete, false);
assert.equal(state.releaseReady, false);
assert.equal(state.newP1231Allocated, false);

console.log('Project production-entry active-owner partition model: PASS');
console.log(`activeOwners=${ACTIVE_P0.length + ACTIVE_P1.length}`);
for (const [id,w] of Object.entries(waves)) console.log(`${id}=${w.p0.length + w.p1.length} ${w.name}`);
