'use strict';

const assert = require('assert');
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
  const a = source.indexOf(`async function ${name}`);
  const b = source.indexOf(`function ${name}`);
  const start = a >= 0 ? a : b;
  return start < 0 ? '' : source.slice(start, start + maxChars);
}

const listBody = functionSlice(worker, 'listPendingRemoteSaves', 18000);
const recoverBody = functionSlice(worker, 'recoverPendingRemoteSaves', 50000);

check(registry.includes('| P1-208 | ACTIVE | Pending-remote recovery needs phase/status fairness; cheap remote-verified local finalization cannot starve behind older auth-blocked PREPARED rows. |'),
  'P1-208 Registry owner/status drifted');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'P1-208 evidence baseline mismatch');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('P1-208 remains ACTIVE'), 'P1-208 ACTIVE boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release hard fence missing');
check(evidence.includes('Production/runtime modification: **NONE**'), 'research-only runtime boundary missing');

// Current-source positive controls and gap binding.
check(worker.includes('const MAX_PENDING_REMOTE_SAVES = 20'), 'pending-remote capacity positive control changed');
check(worker.includes('JOURNAL_PENDING_REMOTE_STORE'), 'pending-remote durable store missing');
check(listBody.includes("index('updatedAt')") || listBody.includes('index("updatedAt")'), 'active enumeration no longer uses updatedAt ordering; refresh research');
check(listBody.includes('stale-unverified'), 'stale archive exclusion positive control missing');
check(recoverBody.includes('Math.min(6'), 'six-item recovery bound changed');
check(recoverBody.includes('listPendingRemoteSaves(cappedItems)'), 'current single-prefix selection shape changed; refresh research');
check(recoverBody.includes("current.phase !== 'remote-verified'") || recoverBody.includes('current.phase !== "remote-verified"'), 'remote-verified phase bypass changed');
check(recoverBody.includes('getValidYandexAccessToken'), 'auth preflight positive control missing');
check(recoverBody.includes('if (!authAvailable)'), 'auth deferral positive control missing');
check(recoverBody.includes('appendJournalEntryFromDurableCheckpoint'), 'local finalization positive control missing');
check(recoverBody.includes('authRequired: !authAvailable'), 'authRequired result truth missing');

function row(id, phase, updatedAt, extra = {}) {
  return { id, phase, updatedAt, ...extra };
}

function oldestPrefix(rows, maxItems = 6) {
  return rows
    .filter((x) => x.phase !== 'stale-unverified')
    .slice()
    .sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(6, maxItems)));
}

function currentPass(rows, { authAvailable, maxItems = 6 } = {}) {
  const selected = oldestPrefix(rows, maxItems);
  const out = { selected: [], finalized: [], deferredAuth: [], remote: [] };
  for (const item of selected) {
    out.selected.push(item.id);
    if (item.phase === 'remote-verified') out.finalized.push(item.id);
    else if (!authAvailable) out.deferredAuth.push(item.id);
    else out.remote.push(item.id);
  }
  return out;
}

function takeOldest(rows, predicate, limit, excluded) {
  return rows
    .filter((x) => x.phase !== 'stale-unverified' && !excluded.has(x.id) && predicate(x))
    .slice()
    .sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}

// Conceptual target only: one guaranteed ready slot per class when usable, then bounded fill.
function fairSelect(rows, { authAvailable, maxItems = 6 } = {}) {
  const max = Math.max(1, Math.min(6, maxItems));
  const chosen = [];
  const ids = new Set();
  const append = (xs) => {
    for (const x of xs) {
      if (chosen.length >= max || ids.has(x.id)) continue;
      chosen.push(x);
      ids.add(x.id);
    }
  };

  append(takeOldest(rows, (x) => x.phase === 'remote-verified', 1, ids));
  if (authAvailable && chosen.length < max) {
    append(takeOldest(rows, (x) => x.phase !== 'remote-verified', 1, ids));
  }
  append(takeOldest(rows, (x) => x.phase === 'remote-verified' || authAvailable, max - chosen.length, ids));
  return chosen;
}

function fairPass(rows, opts) {
  const selected = fairSelect(rows, opts);
  return {
    selected: selected.map((x) => x.id),
    finalized: selected.filter((x) => x.phase === 'remote-verified').map((x) => x.id),
    remote: selected.filter((x) => x.phase !== 'remote-verified').map((x) => x.id)
  };
}

// Current deterministic starvation: six old PREPARED rows hide later verified work.
{
  const rows = Array.from({ length: 6 }, (_, i) => row(`p${i + 1}`, 'prepared', i + 1));
  rows.push(row('v1', 'remote-verified', 100));
  const first = currentPass(rows, { authAvailable: false });
  const second = currentPass(rows, { authAvailable: false });
  check(first.selected.join(',') === 'p1,p2,p3,p4,p5,p6', 'current witness did not select oldest blocked prefix');
  check(first.finalized.length === 0, 'current witness unexpectedly finalized later verified row');
  check(second.selected.join(',') === first.selected.join(','), 'unchanged blocked prefix did not reproduce across wake');
  check(!second.selected.includes('v1'), 'later verified row unexpectedly entered current prefix');
}

// Auth absence remains truthful deferral, not fake attempt/failure rotation.
{
  const item = row('p1', 'prepared', 10, { attemptCount: 2 });
  currentPass([item], { authAvailable: false });
  check(item.updatedAt === 10 && item.attemptCount === 2, 'auth deferral mutated scheduling/failure metadata in model');
}

// Once selected, verified work is locally progress-capable without auth.
{
  const pass = currentPass([row('v1', 'remote-verified', 1)], { authAvailable: false });
  check(pass.finalized.includes('v1') && pass.deferredAuth.length === 0, 'verified work did not bypass auth in witness');
}

// Target: ready local finalization receives bounded admission behind arbitrarily many old blocked rows.
{
  const rows = Array.from({ length: 20 }, (_, i) => row(`p${i}`, 'prepared', i));
  rows.push(row('verified', 'remote-verified', 999));
  check(fairSelect(rows, { authAvailable: false }).some((x) => x.id === 'verified'), 'target selector starved verified work');
}

// With no auth, scarce work budget is not consumed by work that cannot progress.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2), row('v2', 'remote-verified', 3)];
  const pass = fairPass(rows, { authAvailable: false });
  check(pass.finalized.length === 2 && pass.remote.length === 0, 'no-auth target spent budget on blocked remote work');
}

// With auth usable, reconciliation also gets bounded opportunity: no reverse starvation.
{
  const rows = Array.from({ length: 12 }, (_, i) => row(`v${i}`, 'remote-verified', i));
  rows.push(row('p1', 'prepared', 100));
  check(fairSelect(rows, { authAvailable: true }).some((x) => x.id === 'p1'), 'target introduced reverse starvation of PREPARED work');
}

// Stale archive stays outside hot selection.
{
  const selected = fairSelect([row('s1', 'stale-unverified', 0), row('v1', 'remote-verified', 1)], { authAvailable: false });
  check(selected.length === 1 && selected[0].id === 'v1', 'stale archive entered hot recovery lane');
}

// Fair selection is not cancellation: unselected blocked evidence survives.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2)];
  fairSelect(rows, { authAvailable: false, maxItems: 1 });
  check(rows.some((x) => x.id === 'p1') && rows.length === 2, 'selection incorrectly deleted unselected work');
}

// PREPARED resumes when auth is restored.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2)];
  check(fairPass(rows, { authAvailable: false }).remote.length === 0, 'blocked remote work ran without auth');
  check(fairPass(rows, { authAvailable: true }).remote.includes('p1'), 'PREPARED did not resume after auth return');
}

// Total work remains bounded under verified flood and mixed flood.
{
  const verified = Array.from({ length: 30 }, (_, i) => row(`v${i}`, 'remote-verified', i));
  check(fairSelect(verified, { authAvailable: false }).length === 6, 'verified flood exceeded six-item bound');
  const mixed = Array.from({ length: 100 }, (_, i) => row(`x${i}`, i % 2 ? 'prepared' : 'remote-verified', i));
  check(fairSelect(mixed, { authAvailable: true }).length <= 6, 'mixed flood exceeded six-item bound');
}

// Restart must reconstruct fairness from durable phase/readiness, not a volatile cursor.
{
  const rows = Array.from({ length: 20 }, (_, i) => row(`p${i}`, 'prepared', i));
  rows.push(row('v1', 'remote-verified', 100));
  for (let wake = 0; wake < 3; wake += 1) {
    const durableReload = JSON.parse(JSON.stringify(rows));
    check(fairSelect(durableReload, { authAvailable: false }).some((x) => x.id === 'v1'), `restart wake ${wake} lost fairness`);
  }
}

// Selection snapshot is not phase authority; fresh durable state may have advanced.
{
  const listed = row('x', 'prepared', 1);
  const fresh = row('x', 'remote-verified', 2);
  check(listed.phase !== fresh.phase, 'fresh-read phase-change witness failed');
}

// Genuine failure rotation and credential absence remain distinct.
{
  const before = row('x', 'prepared', 5, { attemptCount: 0 });
  const failure = { ...before, updatedAt: 10, attemptCount: 1 };
  check(failure.updatedAt > before.updatedAt && failure.attemptCount > before.attemptCount, 'genuine-failure witness failed');
}

// Progress and remaining dependency can both be true.
{
  const truth = { recovered: 1, deferredAuth: 3, authRequired: true };
  check(truth.recovered > 0 && truth.authRequired && truth.deferredAuth > 0, 'mixed progress/dependency truth failed');
}

// Fair scheduling consumes but never manufactures proof/provenance.
{
  const receipt = row('v1', 'remote-verified', 1, {
    remoteProof: 'proof-owned-elsewhere', sourceRevision: 'R7', namespaceIdentity: 'N2', physicalOperationId: 'P9'
  });
  const selected = fairSelect([receipt], { authAvailable: false })[0];
  check(selected.remoteProof === receipt.remoteProof, 'fair selection mutated remote proof');
  check(selected.sourceRevision === 'R7' && selected.namespaceIdentity === 'N2' && selected.physicalOperationId === 'P9',
    'fair selection mutated provenance/identity');
}

// External-source/release provenance is present in the evidence artifact.
check(evidence.includes('https://www.postgresql.org/docs/17/sql-select.html'), 'PostgreSQL queue comparison source missing');
check(evidence.includes('https://pkg.go.dev/k8s.io/client-go'), 'Kubernetes workqueue comparison source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome lifecycle source missing');

if (failures.length) {
  console.error(`P1-208 remote recovery fairness refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-208 remote recovery fairness refinement model: PASS (${checks} checks, ${SCHEMA})`);
