'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionBody(name, maxChars = 70000) {
  const asyncNeedle = `async function ${name}`;
  const plainNeedle = `function ${name}`;
  let start = worker.indexOf(asyncNeedle);
  if (start < 0) start = worker.indexOf(plainNeedle);
  if (start < 0) return '';
  const nextAsync = worker.indexOf('\nasync function ', start + 20);
  const nextPlain = worker.indexOf('\nfunction ', start + 20);
  const candidates = [nextAsync, nextPlain].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : Math.min(worker.length, start + maxChars);
  return worker.slice(start, end);
}

const listBody = functionBody('listPendingRemoteSaves');
const recoveryBody = functionBody('recoverPendingRemoteSaves');

// Positive controls that must survive implementation.
requireSource(/MAX_PENDING_REMOTE_SAVES\s*=\s*20/.test(worker), 'missing bounded active pending-remote capacity positive control');
requireSource(/PENDING_REMOTE_STALE_RETENTION_MS/.test(worker), 'missing stale evidence retention positive control');
requireSource(/JOURNAL_PENDING_REMOTE_STORE/.test(worker), 'missing pending remote durable store');
requireSource(/index\(['"]updatedAt['"]\)/.test(listBody), 'missing existing updatedAt ordering positive control');
requireSource(/includeStale/.test(listBody) && /stale-unverified/.test(listBody), 'ordinary active enumeration no longer visibly excludes stale archive');
requireSource(/Math\.min\(6/.test(recoveryBody), 'missing six-item per-pass hard bound');
requireSource(/phase\s*!==\s*['"]remote-verified['"]/.test(recoveryBody), 'missing remote-verified phase distinction');
requireSource(/appendJournalEntryFromDurableCheckpoint/.test(recoveryBody), 'missing durable local Journal finalization path');
requireSource(/markPendingRemoteSaveFailure/.test(worker), 'missing genuine remote failure transition positive control');
requireSource(/attemptCount/.test(worker) && /updatedAt:\s*Date\.now\(\)/.test(worker), 'missing durable attempt/error rotation positive control');

// Target 1: durable storage exposes bounded phase-aware or eligibility-aware candidate access.
requireSource(
  /phaseUpdatedAt|phase_updated_at|nextAttemptAt|recoveryLane|recoveryClass|eligibleAt/.test(worker),
  'pendingRemoteSaves has no visible durable phase/eligibility scheduling primitive'
);
requireSource(
  /createIndex\([^\n]*(?:phaseUpdatedAt|nextAttemptAt|recoveryLane|recoveryClass|eligibleAt)/.test(worker) ||
  /index\([^\n]*(?:phaseUpdatedAt|nextAttemptAt|recoveryLane|recoveryClass|eligibleAt)/.test(worker),
  'no visible IndexedDB index/cursor supports bounded phase-aware recovery selection'
);

// Target 2: selector is explicitly fair across local-finalization and remote-reconcile lanes.
requireSource(
  /selectPendingRemote.*Fair|selectRemoteRecovery.*Batch|listPendingRemote.*Phase|remoteRecovery.*Lane|localFinalization.*(?:quota|slot)|verified.*(?:quota|slot)/i.test(worker),
  'no explicit bounded phase-aware fair selector/lane admission is visible'
);
requireSource(
  /remote-verified[\s\S]{0,5000}(?:quota|slot|lane|priority|phaseUpdatedAt|recoveryClass)/i.test(worker) ||
  /(?:quota|slot|lane|priority)[\s\S]{0,5000}remote-verified/i.test(worker),
  'remote-verified local-finalization work has no visible guaranteed bounded admission'
);
requireSource(
  /authAvailable[\s\S]{0,10000}(?:quota|slot|lane|remote-reconcile|prepared)/i.test(worker) ||
  /(?:remote-reconcile|prepared)[\s\S]{0,10000}authAvailable/i.test(worker),
  'auth-usable remote reconciliation has no visible bounded share preventing reverse starvation'
);

// Target 3: the single oldest updatedAt prefix may remain as diagnostics/fallback, but cannot be the entire recovery authority.
requireSource(
  !/const\s+queue\s*=\s*await\s+listPendingRemoteSaves\(cappedItems\)\s*;/.test(recoveryBody) ||
  /selectPendingRemote.*Fair|selectRemoteRecovery.*Batch|listPendingRemote.*Phase|recoveryLane/i.test(recoveryBody),
  'recoverPendingRemoteSaves still consumes only one phase-blind oldest updatedAt prefix'
);

// Target 4: lack of auth must not be turned into fake remote attempt rotation merely for fairness.
const authDeferralMatch = recoveryBody.match(/if\s*\(\s*!authAvailable\s*\)\s*\{([\s\S]{0,1500}?)\}/);
if (authDeferralMatch) {
  requireSource(!/markPendingRemoteSaveFailure|attemptCount|updatedAt\s*:|Date\.now/.test(authDeferralMatch[1]),
    'auth deferral appears to mutate failure/attempt age merely to rotate scheduling');
}

// Target 5: current durable checkpoint is fresh-read before phase-dependent action.
requireSource(
  /getPendingRemoteSave|readPendingRemoteSave|loadPendingRemoteSave|pending.*\.get\(.*id|fresh.*pending.*remote/i.test(recoveryBody),
  'selected pending-remote row is not visibly fresh-read before phase-dependent action'
);

// Target 6: remote-verified remains locally finalizable without entering the auth-dependent Yandex block.
requireSource(/if\s*\(\s*current\.phase\s*!==\s*['"]remote-verified['"]\s*\)/.test(recoveryBody),
  'remote-verified no longer visibly bypasses auth-dependent remote reconciliation');
requireSource(/appendJournalEntryFromDurableCheckpoint/.test(recoveryBody),
  'remote-verified local finalization path is missing');

// Target 7: status/result can express useful progress while auth-required work remains.
requireSource(/authRequired/.test(recoveryBody), 'recovery result lost authRequired truth');
requireSource(/recovered/.test(recoveryBody) && /deferred/.test(recoveryBody), 'recovery result lost progress/deferred counters');
requireSource(
  /deferredAuth|authDeferred|blockedByAuth|pendingByPhase|phaseCounts/.test(recoveryBody),
  'recovery result has no visible phase/auth-blocked diagnostic truth after fair scheduling'
);

// Target 8: implementation must stay bounded and avoid materializing the whole active store merely to classify phases.
requireSource(/Math\.min\(6/.test(recoveryBody), 'per-pass work bound changed or disappeared');
requireSource(
  !/getAll\(\)[\s\S]{0,10000}(?:remote-verified|prepared)/.test(listBody + recoveryBody),
  'phase fairness appears to classify an unbounded getAll result in memory'
);

// Target 9: archived stale evidence stays outside ordinary hot-lane selection.
requireSource(/stale-unverified/.test(listBody) || /stale-unverified/.test(recoveryBody),
  'stale archive exclusion is no longer visible');

// Target 10: P1-208 must not manufacture remote verification as a scheduling shortcut.
requireSource(/markPendingRemoteSaveVerified/.test(worker), 'remote verification transition positive control missing');
requireSource(/assertExactYandexRemoteByteSize/.test(worker), 'exact remote size verification positive control missing');

if (failures.length) {
  console.error('P1-208 remote recovery phase fairness source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-208 remote recovery phase fairness source gate: PASS');
