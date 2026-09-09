'use strict';

const assert = require('assert');
let cases = 0;
function check(condition, message) {
  cases += 1;
  assert.ok(condition, message);
}
function equal(actual, expected, message) {
  cases += 1;
  assert.deepStrictEqual(actual, expected, message);
}

const waves = {
  W1: [
    'P0-023','P0-070','P0-072','P0-073','P0-074','P0-076','P0-078','P0-079','P0-080',
    'P1-076','P1-086','P1-090','P1-125','P1-146','P1-179','P1-183','P1-184','P1-194','P1-198','P1-207','P1-210'
  ],
  W2: [
    'P1-004','P1-124','P1-130','P1-156','P1-157','P1-169','P1-171','P1-175','P1-193','P1-199',
    'P1-200','P1-201','P1-203','P1-204','P1-209','P1-214','P1-217','P1-222','P1-223','P1-227'
  ],
  W3: [
    'P0-004','P1-001','P1-003','P1-150','P1-154','P1-187','P1-212','P1-218','P1-219','P1-220',
    'P1-221','P1-224','P1-226','P1-228','P1-229','P1-230'
  ],
  W4: [
    'P0-013','P0-050','P1-008','P1-185','P1-186','P1-188','P1-189','P1-190','P1-197','P1-202',
    'P1-205','P1-206','P1-211','P1-216','P1-225'
  ],
  W5: [
    'P0-022','P0-045','P0-066','P0-069','P0-075','P1-138','P1-161','P1-164','P1-165','P1-172',
    'P1-176','P1-177','P1-178','P1-180','P1-182','P1-191','P1-195','P1-196'
  ],
  W6: [
    'P1-009','P1-035','P1-043','P1-064','P1-158','P1-160','P1-162','P1-163','P1-166','P1-167',
    'P1-168','P1-170','P1-173','P1-174','P1-192','P1-208'
  ]
};

const expectedCounts = { W1: 21, W2: 20, W3: 16, W4: 15, W5: 18, W6: 16 };
for (const [wave, expected] of Object.entries(expectedCounts)) {
  equal(waves[wave].length, expected, `${wave} owner count`);
}
const allOwners = Object.values(waves).flat();
equal(allOwners.length, 106, 'total ACTIVE owner denominator');
equal(new Set(allOwners).size, 106, 'every ACTIVE owner has one primary wave');
equal(allOwners.filter(x => x.startsWith('P0-')).length, 17, 'ACTIVE P0 denominator');
equal(allOwners.filter(x => x.startsWith('P1-')).length, 89, 'ACTIVE P1 denominator');
check(!allOwners.includes('P1-231'), 'P1-231 remains unallocated');

const schemas = {
  WebClipOperationReceipts: 1,
  WebClipPdfRetryCache: 4,
  WebClipJournal: 8,
  WebClipOperationLogs: 3,
  WebClipOffscreenTransfers: 1
};
equal(schemas.WebClipOperationReceipts, 1, 'OperationReceipts schema freezes at v1');
equal(schemas.WebClipPdfRetryCache, 4, 'PDF retry cache freezes at v4');
equal(schemas.WebClipJournal, 8, 'Journal final forward package is v8');
equal(schemas.WebClipOperationLogs, 3, 'OperationLog final forward package is v3');
equal(schemas.WebClipOffscreenTransfers, 1, 'OffscreenTransfers needs no schema bump');

const journalV8Stores = new Set([
  'entries','urlStats','meta','pendingAppends','pendingDownloads','pendingRemoteSaves','importStaging',
  'journalFinalizations','pendingRemoteMutations','urlStatsV2','journalSummaries'
]);
for (const store of ['journalFinalizations','pendingRemoteMutations','urlStatsV2','journalSummaries']) {
  check(journalV8Stores.has(store), `Journal v8 contains ${store}`);
}
check(journalV8Stores.has('urlStats'), 'legacy urlStats remains for compatibility cutover');

const journalV8Meta = new Set([
  'datasetGeneration','authorityMode','urlIdentityMigration','publishedUrlStatsGeneration',
  'urlStatsSourceRevision','urlStatsState','durableUrlSchemaVersion','selectionSnapshotSchemaVersion',
  'historicalRemoteProvenanceVersion','journalSummaryProjectionGeneration','maintenanceCursorVersion'
]);
for (const meta of ['datasetGeneration','authorityMode','urlIdentityMigration','publishedUrlStatsGeneration','selectionSnapshotSchemaVersion']) {
  check(journalV8Meta.has(meta), `Journal v8 metadata contains ${meta}`);
}

const operationReceiptStores = new Set(['receipts','resourceReservations']);
check(operationReceiptStores.has('receipts'), 'functional operation authority is separate from diagnostics');
check(operationReceiptStores.has('resourceReservations'), 'global storage reservation has a durable owner store');
check(!operationReceiptStores.has('logs'), 'OperationReceipt DB does not absorb diagnostic logs');

const canonicalGenerationFields = [
  'physicalOperationId','sourceGenerationId','applicationGeneration','selectionRevision','renderAttemptId',
  'pdfGeneration','authAttemptGeneration','authGeneration','configGeneration','publicationPolicyGeneration',
  'journalDatasetGenerationId','entryRevision','journalRevision','frameSessionGeneration','hostPermissionGeneration',
  'frameCommandGeneration','remotePrintGeneration','pageMutationGeneration','urlStatsGeneration',
  'operationLogHistoryGeneration','settingsImportGeneration','maintenanceGeneration','storageReservationId'
];
equal(new Set(canonicalGenerationFields).size, canonicalGenerationFields.length, 'canonical generation field names are unique');
for (const forbidden of ['generation','AG','PG','JG','ER','HG','SIG','FS','R','M']) {
  check(!canonicalGenerationFields.includes(forbidden), `persistence vocabulary forbids ambiguous shorthand ${forbidden}`);
}
check(canonicalGenerationFields.includes('applicationGeneration'), 'application generation uses full name');
check(canonicalGenerationFields.includes('authAttemptGeneration'), 'OAuth attempt generation uses full name');
check(canonicalGenerationFields.includes('hostPermissionGeneration'), 'permission generation uses full name');
check(canonicalGenerationFields.includes('publicationPolicyGeneration'), 'publication generation uses full name');

const nodes = new Set([
  'A0','U0','J0','SECURITY_BASE','A1','A2','B0','B1','W5_AUTH_CORE','C0','C1','D0','D1','D2','E0','E1','Z0',
  'W2_DOC_ROUTING','W2_BROWSER_EFFECTS','W2_FRAME_SUBSTRATE','W2_REMOTE_PRINT','W2_CONTROL_PLANE',
  'W3_LEDGER','W3_SELECTION','W3_REPRESENTATION','W3_CROSS_FRAME','W3_FIDELITY_CLOSE',
  'W4_PORTABLE','W4_URL_PROJECTION','W4_VIEW','P1_202_DECISION','W4_COMMENTS','W4_HISTORY','W4_SETTINGS',
  'W6_STORAGE','W6_SETTLEMENT_CAP','W6_QUEUE_BOUNDS','W6_JOURNAL_SCALE','W6_FAIRNESS','W6_PARSER',
  'YANDEX_L5','RELEASE_QA'
]);
const edges = [
  ['A0','U0'],['U0','J0'],['U0','SECURITY_BASE'],['J0','A1'],['A1','A2'],['A2','B0'],['B0','B1'],
  ['SECURITY_BASE','W5_AUTH_CORE'],['W5_AUTH_CORE','C0'],['B1','C0'],['C0','C1'],['B1','C1'],
  ['J0','D0'],['A2','D0'],['D0','D1'],['C1','D2'],['D0','D2'],['D1','E0'],['D2','E0'],['E0','E1'],['E1','Z0'],

  ['A1','W2_DOC_ROUTING'],['A2','W2_BROWSER_EFFECTS'],['W2_DOC_ROUTING','W2_FRAME_SUBSTRATE'],
  ['SECURITY_BASE','W2_FRAME_SUBSTRATE'],['W2_FRAME_SUBSTRATE','W2_REMOTE_PRINT'],['W2_BROWSER_EFFECTS','W2_CONTROL_PLANE'],

  ['W3_LEDGER','W3_REPRESENTATION'],['W3_SELECTION','W3_REPRESENTATION'],['W2_FRAME_SUBSTRATE','W3_CROSS_FRAME'],
  ['W2_REMOTE_PRINT','W3_CROSS_FRAME'],['W3_REPRESENTATION','W3_CROSS_FRAME'],['W3_CROSS_FRAME','W3_FIDELITY_CLOSE'],
  ['B1','W3_FIDELITY_CLOSE'],

  ['J0','W4_PORTABLE'],['J0','W4_URL_PROJECTION'],['W4_URL_PROJECTION','W4_VIEW'],['D0','W4_COMMENTS'],
  ['P1_202_DECISION','W4_COMMENTS'],['J0','W4_HISTORY'],['U0','W4_SETTINGS'],

  ['A0','W6_STORAGE'],['W2_BROWSER_EFFECTS','W6_SETTLEMENT_CAP'],['W4_HISTORY','W6_QUEUE_BOUNDS'],
  ['J0','W6_JOURNAL_SCALE'],['J0','W6_FAIRNESS'],['C1','W6_FAIRNESS'],

  ['C1','YANDEX_L5'],['W5_AUTH_CORE','YANDEX_L5'],['YANDEX_L5','RELEASE_QA'],['Z0','RELEASE_QA'],['W3_FIDELITY_CLOSE','RELEASE_QA']
];
for (const [from, to] of edges) {
  check(nodes.has(from) && nodes.has(to), `dependency edge ${from}->${to} references known nodes`);
}

function topologicalOrder(nodeSet, graphEdges) {
  const indegree = new Map([...nodeSet].map(n => [n, 0]));
  const out = new Map([...nodeSet].map(n => [n, []]));
  for (const [a,b] of graphEdges) {
    out.get(a).push(b);
    indegree.set(b, indegree.get(b) + 1);
  }
  const queue = [...nodeSet].filter(n => indegree.get(n) === 0).sort();
  const order = [];
  while (queue.length) {
    const n = queue.shift();
    order.push(n);
    for (const b of out.get(n)) {
      indegree.set(b, indegree.get(b) - 1);
      if (indegree.get(b) === 0) queue.push(b);
    }
    queue.sort();
  }
  return order;
}
const topo = topologicalOrder(nodes, edges);
equal(topo.length, nodes.size, 'final dependency graph is acyclic');
const pos = new Map(topo.map((n,i) => [n,i]));
function before(a,b,msg) { check(pos.get(a) < pos.get(b), msg || `${a} precedes ${b}`); }
before('J0','D0','J0 passive v8 precedes Journal CAS activation');
before('B1','C1','immutable PDF generation precedes exact remote-content proof');
before('W5_AUTH_CORE','C0','validated auth capability precedes immutable remote context');
before('W5_AUTH_CORE','C1','validated auth capability precedes remote exact-content closure');
before('W2_FRAME_SUBSTRATE','W3_CROSS_FRAME','frame identity precedes cross-frame fidelity');
before('W2_REMOTE_PRINT','W3_CROSS_FRAME','remote print generation precedes cross-frame representation closure');
before('D0','W4_COMMENTS','JG/ER CAS precedes transactional comments');
before('P1_202_DECISION','W4_COMMENTS','deleted-comment product decision gates comment deletion semantics');
before('C1','YANDEX_L5','internal remote implementation precedes provider closure');
before('YANDEX_L5','RELEASE_QA','provider L5 precedes release decision');

const w6CoLanding = {
  OperationReceipts: ['W6_STORAGE'],
  BrowserActualEffects: ['W6_SETTLEMENT_CAP'],
  OperationLogsV3: ['W6_QUEUE_BOUNDS'],
  JournalV8: ['W6_JOURNAL_SCALE','W6_FAIRNESS']
};
for (const [surface, overlays] of Object.entries(w6CoLanding)) {
  check(overlays.length > 0, `${surface} carries minimum W6 bound at creation/activation`);
}

const productGates = { 'P1-202': 'UNDECIDED' };
equal(productGates['P1-202'], 'UNDECIDED', 'P1-202 remains explicit product decision gate');
const external = {
  YANDEX_L5: 'EXTERNAL_REQUIRED',
  CURRENT_CHROME_NATIVE_QA: 'REQUIRED',
  PD7_STABLE_153: 'FEATURE_INACTIVE_WATCH'
};
equal(external.YANDEX_L5, 'EXTERNAL_REQUIRED', 'Yandex L5 is not fabricated internally');
equal(external.CURRENT_CHROME_NATIVE_QA, 'REQUIRED', 'current Chrome/native restart/prompt QA remains required');
equal(external.PD7_STABLE_153, 'FEATURE_INACTIVE_WATCH', 'PD7 stays feature-inactive watch for exact Stable baseline');

const finalState = {
  researchCoverageComplete: true,
  w1w6ImplementationReadinessReconciled: true,
  productionImplementationComplete: false,
  criticalClosureComplete: false,
  releaseReady: false,
  newPCodeAllocated: false
};
equal(finalState.researchCoverageComplete, true, 'research coverage remains complete for exact baseline');
equal(finalState.w1w6ImplementationReadinessReconciled, true, 'W1-W6 readiness is reconciled at architecture level');
equal(finalState.productionImplementationComplete, false, 'research does not claim production implementation');
equal(finalState.criticalClosureComplete, false, 'research does not claim critical closure');
equal(finalState.releaseReady, false, 'research does not claim release readiness');
equal(finalState.newPCodeAllocated, false, 'cross-wave composition allocates no new P-code');

console.log(`Final W1-W6 cross-wave reconciliation model: PASS; cases=${cases}`);
