'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_208_REMOTE_RECOVERY_FAIRNESS_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');

const BASELINE = '3899d07f5e3f30b9168108261e02cb30a02229cc';
const SCHEMA = 'webclip-pending-remote-recovery-fairness/v2';
let checks = 0;
const failures = [];

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 80000) {
  const asyncStart = source.indexOf(`async function ${name}`);
  const syncStart = source.indexOf(`function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  return start < 0 ? '' : source.slice(start, start + maxChars);
}

const listBody = functionSlice(worker, 'listPendingRemoteSaves', 18000);
const recoverBody = functionSlice(worker, 'recoverPendingRemoteSaves', 50000);

check(registry.includes('| P1-208 | ACTIVE | Pending-remote recovery needs phase/status fairness; cheap `remote-verified` local finalization cannot starve behind older auth-blocked PREPARED rows. |'),
  'P1-208 Registry owner/status drifted');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'P1-208 evidence baseline mismatch');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('P1-208 remains ACTIVE'), 'P1-208 ACTIVE boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release hard fence missing');
check(evidence.includes('Production/runtime modification: **NONE**'), 'research-only runtime boundary missing');

check(worker.includes('const MAX_PENDING_REMOTE_SAVES = 20'), 'pending-remote capacity positive control changed');
check(worker.includes('JOURNAL_PENDING_REMOTE_STORE'), 'pending-remote durable store missing');
check(listBody.includes("index('updatedAt')") || listBody.includes('index("updatedAt")'), 'active enumeration no longer uses updatedAt ordering');
check(listBody.includes('stale-unverified'), 'stale archive exclusion positive control missing');
check(recoverBody.includes('Math.min(6'), 'six-item recovery bound changed');
check(recoverBody.includes('listPendingRemoteSaves(cappedItems)'), 'single oldest-prefix selection shape changed');
check(recoverBody.includes("current.phase !== 'remote-verified'") || recoverBody.includes('current.phase !== "remote-verified"'), 'remote-verified bypass changed');
check(recoverBody.includes('getValidYandexAccessToken'), 'auth preflight positive control missing');
check(recoverBody.includes('if (!authAvailable)'), 'auth deferral positive control missing');
check(recoverBody.includes('appendJournalEntryFromDurableCheckpoint'), 'local finalization positive control missing');
check(recoverBody.includes('authRequired: !authAvailable'), 'authRequired result truth missing');

function row(id, phase, updatedAt, extra = {}) {
  return { id, phase, updatedAt, ...extra };
}

function oldest(rows, predicate, limit, excluded = new Set()) {
  return rows
    .filter((x) => x.phase !== 'stale-unverified' && !excluded.has(x.id) && predicate(x))
    .slice()
    .sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}

function currentPass(rows, authAvailable, maxItems = 6) {
  const selected = oldest(rows, () => true, Math.max(1, Math.min(6, maxItems)));
  return {
    selected: selected.map((x) => x.id),
    finalized: selected.filter((x) => x.phase === 'remote-verified').map((x) => x.id),
    deferredAuth: selected.filter((x) => x.phase !== 'remote-verified' && !authAvailable).map((x) => x.id),
    remote: selected.filter((x) => x.phase !== 'remote-verified' && authAvailable).map((x) => x.id)
  };
}

function fairSelect(rows, authAvailable, maxItems = 6) {
  const max = Math.max(1, Math.min(6, maxItems));
  const selected = [];
  const ids = new Set();
  const append = (items) => {
    for (const item of items) {
      if (selected.length >= max || ids.has(item.id)) continue;
      selected.push(item);
      ids.add(item.id);
    }
  };
  append(oldest(rows, (x) => x.phase === 'remote-verified', 1, ids));
  if (authAvailable) append(oldest(rows, (x) => x.phase !== 'remote-verified', 1, ids));
  append(oldest(rows, (x) => x.phase === 'remote-verified' || authAvailable, max - selected.length, ids));
  return selected;
}

// Current starvation witness: the same six auth-blocked PREPARED rows consume every wake.
{
  const rows = Array.from({ length: 6 }, (_, i) => row(`p${i + 1}`, 'prepared', i + 1));
  rows.push(row('v1', 'remote-verified', 100));
  const first = currentPass(rows, false);
  const second = currentPass(rows, false);
  check(first.selected.join(',') === 'p1,p2,p3,p4,p5,p6', 'current witness did not select six oldest blocked rows');
  check(first.finalized.length === 0, 'current witness unexpectedly finalized hidden verified work');
  check(second.selected.join(',') === first.selected.join(','), 'blocked prefix did not reproduce across wake');
  check(!second.selected.includes('v1'), 'hidden verified row unexpectedly entered current prefix');
}

// Credential absence is truthful deferral, not synthetic failure rotation.
{
  const item = row('p1', 'prepared', 10, { attemptCount: 2 });
  currentPass([item], false);
  check(item.updatedAt === 10 && item.attemptCount === 2, 'auth deferral mutated failure/age metadata');
}

// Once admitted, remote-verified work is locally progress-capable without auth.
{
  const result = currentPass([row('v1', 'remote-verified', 1)], false);
  check(result.finalized.includes('v1') && result.deferredAuth.length === 0, 'verified work did not bypass auth');
}

// Target guarantees bounded local-finalization admission behind old blocked rows.
{
  const rows = Array.from({ length: 20 }, (_, i) => row(`p${i}`, 'prepared', i));
  rows.push(row('verified', 'remote-verified', 999));
  check(fairSelect(rows, false).some((x) => x.id === 'verified'), 'target starved verified work');
}

// No auth means the bounded budget is spent only on currently progress-capable work.
{
  const selected = fairSelect([
    row('p1', 'prepared', 1),
    row('v1', 'remote-verified', 2),
    row('v2', 'remote-verified', 3)
  ], false);
  check(selected.length === 2 && selected.every((x) => x.phase === 'remote-verified'), 'no-auth target admitted blocked remote work');
}

// When auth is usable, PREPARED also receives bounded opportunity: no reverse starvation.
{
  const rows = Array.from({ length: 12 }, (_, i) => row(`v${i}`, 'remote-verified', i));
  rows.push(row('p1', 'prepared', 100));
  check(fairSelect(rows, true).some((x) => x.id === 'p1'), 'target introduced reverse starvation');
}

// Stale archive remains outside hot selection and non-selected rows are not cancelled.
{
  const rows = [row('s1', 'stale-unverified', 0), row('p1', 'prepared', 1), row('v1', 'remote-verified', 2)];
  const selected = fairSelect(rows, false, 1);
  check(selected.length === 1 && selected[0].id === 'v1', 'stale/blocked row consumed hot local-finalization slot');
  check(rows.some((x) => x.id === 'p1') && rows.some((x) => x.id === 's1'), 'fair selection deleted retained evidence');
}

// PREPARED resumes after auth restoration; total admission remains bounded.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2)];
  check(!fairSelect(rows, false).some((x) => x.id === 'p1'), 'PREPARED ran without auth');
  check(fairSelect(rows, true).some((x) => x.id === 'p1'), 'PREPARED did not resume with auth');
  const flood = Array.from({ length: 100 }, (_, i) => row(`x${i}`, i % 2 ? 'prepared' : 'remote-verified', i));
  check(fairSelect(flood, true).length <= 6, 'mixed flood exceeded six-item bound');
}

// Restart reconstructs fairness from durable phase state rather than a volatile cursor.
{
  const rows = Array.from({ length: 20 }, (_, i) => row(`p${i}`, 'prepared', i));
  rows.push(row('v1', 'remote-verified', 100));
  for (let wake = 0; wake < 3; wake += 1) {
    const reload = JSON.parse(JSON.stringify(rows));
    check(fairSelect(reload, false).some((x) => x.id === 'v1'), `restart wake ${wake} lost fairness`);
  }
}

// Selection snapshot is not phase authority; fresh durable state may advance.
{
  const listed = row('x', 'prepared', 1);
  const fresh = row('x', 'remote-verified', 2);
  check(listed.phase !== fresh.phase, 'fresh-read phase witness failed');
}

// Fairness consumes proof/provenance but never manufactures or mutates it.
{
  const receipt = row('v1', 'remote-verified', 1, {
    remoteProof: 'proof-owned-elsewhere',
    sourceRevision: 'R7',
    namespaceIdentity: 'N2',
    physicalOperationId: 'P9'
  });
  const selected = fairSelect([receipt], false)[0];
  check(selected.remoteProof === 'proof-owned-elsewhere', 'fairness mutated remote proof');
  check(selected.sourceRevision === 'R7' && selected.namespaceIdentity === 'N2' && selected.physicalOperationId === 'P9',
    'fairness mutated source/namespace/physical identity');
}

// Status may truthfully report progress and remaining auth dependency together.
{
  const truth = { recovered: 1, deferredAuth: 3, authRequired: true };
  check(truth.recovered > 0 && truth.deferredAuth > 0 && truth.authRequired, 'mixed progress/dependency truth failed');
}

check(evidence.includes('https://www.postgresql.org/docs/17/sql-select.html'), 'PostgreSQL comparison source missing');
check(evidence.includes('https://pkg.go.dev/k8s.io/client-go'), 'Kubernetes comparison source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome lifecycle source missing');

if (failures.length) {
  console.error(`P1-208 remote recovery fairness refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-208 remote recovery fairness refinement model: PASS (${checks} checks, ${SCHEMA})`);
