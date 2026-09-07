'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionBody(name, maxChars = 50000) {
  const start = worker.indexOf(`async function ${name}`);
  if (start < 0) return '';
  const next = worker.indexOf('\nasync function ', start + 20);
  return worker.slice(start, next > start ? next : Math.min(worker.length, start + maxChars));
}

// Positive controls that must survive the P1-207 implementation.
requireSource(/JOURNAL_META_STORE/.test(worker) && /JOURNAL_META_REVISION_KEY/.test(worker), 'missing authoritative Journal DB revision primitive');
requireSource(/async function journalRevisionSnapshot\s*\(/.test(worker), 'missing bounded Journal DB revision snapshot helper');
requireSource(/revisionBefore[\s\S]{0,50000}revisionAfter/.test(functionBody('stageFullJournalExportOnce')), 'missing export before/after revision fence');
requireSource(/JOURNAL_CHANGED_DURING_EXPORT/.test(functionBody('stageFullJournalExportOnce')), 'missing bounded stale-export rejection');
requireSource(/for \(let attempt = 0; attempt < 2; attempt \+= 1\)/.test(functionBody('stageFullJournalExport')), 'missing bounded export retry count');
requireSource(/JOURNAL_BACKUP_PENDING_KEY/.test(worker), 'missing durable backup pending checkpoint');
requireSource(/phase:\s*'prepared'/.test(worker) && /phase:\s*'remote-verified'/.test(worker), 'missing prepared/verified backup phases');
requireSource(/recoverPendingJournalBackup/.test(worker), 'missing backup restart recovery');
requireSource(/mutateJournalBackupState/.test(worker), 'missing serialized durable backup-state mutation');
requireSource(/lastSuccessAt/.test(worker), 'missing historical upload-success timestamp positive control');
requireSource(/JOURNAL_BACKUP_RETRY_ALARM/.test(worker), 'missing backup retry alarm positive control');

// Target 1: the staged immutable artifact receipt must retain the revision actually proved by before/after equality.
const stageBody = functionBody('stageFullJournalExportOnce');
requireSource(/return\s*\{[^}]*sourceRevision\s*:/s.test(stageBody) || /sourceRevision\s*:\s*revisionBefore/.test(stageBody),
  'staged Journal export does not return the exact proved source revision');
requireSource(/sourceRevision|journalRevision/.test(stageBody.slice(Math.max(0, stageBody.lastIndexOf('revisionAfter')))),
  'source revision is not visibly carried from the final equality fence into the staged receipt');

// Target 2: the durable prepared checkpoint must retain source revision and immutable staged content identity.
const uploadBody = functionBody('uploadJournalExportStagedToYandex');
requireSource(/sourceRevision\s*:\s*(?:staged\.)?(?:sourceRevision|journalRevision)/.test(uploadBody),
  'prepared backup checkpoint does not persist staged source revision');
requireSource(/artifactDigest|contentDigest|sha256|digest/i.test(uploadBody),
  'prepared backup checkpoint has no visible immutable staged content digest/identity');

// Target 3: verified/recovered backup receipts must preserve the same source revision; recovery may not relabel with current Journal state.
const recoveryBody = functionBody('recoverPendingJournalBackup');
requireSource(/sourceRevision\s*:\s*pending\.(?:sourceRevision|journalRevision)/.test(recoveryBody) || /\.\.\.pending[\s\S]{0,3000}sourceRevision/.test(recoveryBody),
  'recovered backup result does not visibly preserve pending source revision');
requireSource(!/sourceRevision\s*:\s*await\s+journalRevisionSnapshot/.test(recoveryBody),
  'recovery appears to relabel historical bytes with current Journal revision');

// Target 4: durable success state distinguishes upload completion time from exact revision coverage.
requireSource(/lastBackedUpJournalRevision|lastProtectedJournalRevision|protectedSourceRevision|coveredJournalRevision/.test(worker),
  'journalBackupState has no durable exact source-revision coverage field');
requireSource(/lastSuccessAt/.test(worker) && /lastBackedUpJournalRevision|lastProtectedJournalRevision|protectedSourceRevision|coveredJournalRevision/.test(worker),
  'upload success time and source revision coverage are not visibly separate concepts');

// Target 5: current backup freshness/due decision compares authoritative current DB revision with the protected revision.
const statusBody = functionBody('getJournalBackupStatus');
requireSource(/journalRevisionSnapshot|readJournalDbRevision|JOURNAL_META_REVISION_KEY|currentJournalRevision/.test(statusBody),
  'backup status does not read authoritative current Journal DB revision');
requireSource(/currentJournalRevision|sourceRevision|BackedUpJournalRevision|ProtectedJournalRevision|coveredJournalRevision/i.test(statusBody),
  'backup status has no source-revision coverage comparison');
requireSource(/backupDue|currentProtected|coverageFresh|sourceRevisionFresh|journalRevisionCovered/i.test(statusBody),
  'backup status does not expose current-revision protection/freshness separately from age');

// Target 6: scheduler may not skip a changed/unprotected Journal solely because lastSuccessAt is recent.
requireSource(!/const\s+due\s*=\s*!status\.lastSuccessAt\s*\|\|\s*now\s*>=\s*status\.lastSuccessAt\s*\+\s*status\.intervalMinutes/.test(worker),
  'scheduler due logic is still timestamp-only and can postpone an unprotected newer Journal revision');
requireSource(/currentProtected|coverageFresh|backupDue|sourceRevisionFresh|journalRevisionCovered/i.test(worker),
  'scheduler has no visible exact-coverage predicate');

// Target 7: namespace/account/root generation must be part of the coverage identity; same source revision in another namespace is not current protection.
requireSource(/namespaceGeneration|backupNamespaceGeneration|rootGeneration|accountGeneration|configGeneration/.test(uploadBody),
  'backup prepared receipt has no visible namespace generation binding');
requireSource(/namespaceGeneration|backupNamespaceGeneration|rootGeneration|accountGeneration|configGeneration/.test(statusBody),
  'backup freshness has no visible current namespace-generation comparison');

// Target 8: late old success cannot regress a newer protected pointer merely because it finishes later in wall time.
requireSource(/operationGeneration|backupGeneration|attemptGeneration/.test(uploadBody),
  'backup attempt has no visible generation for stale-success ordering');
requireSource(/expected.*Generation|compare.*Generation|current.*Generation|stale.*backup|stale.*success/i.test(worker),
  'no visible stale old-backup success fence protects a newer coverage pointer');

// Target 9: remote verification remains required; P1-207 consumes P1-184 evidence rather than timestamp-only success.
requireSource(/remote-verified/.test(worker), 'remote-verified checkpoint positive control missing');
requireSource(/verifiedAt/.test(worker) && /actualBytes/.test(worker), 'remote verification receipt positive controls missing');

// Target 10: the Chrome Storage Journal-change notification must not be promoted into source authority.
requireSource(/webclipJournalRevision/.test(worker), 'Journal change notification positive control missing');
requireSource(/JOURNAL_META_REVISION_KEY/.test(worker), 'authoritative DB revision missing independently of notification marker');
requireSource(!/lastBackedUpJournalRevision\s*:\s*.*webclipJournalRevision/.test(worker),
  'backup source coverage appears to use notification marker instead of exact DB revision');

// Target 11: bounded churn handling remains bounded; no endless stabilization loop.
requireSource(/attempt < 2/.test(functionBody('stageFullJournalExport')), 'export stabilization retry is not visibly bounded');
requireSource(!/while\s*\(\s*true\s*\)[\s\S]{0,10000}JOURNAL_CHANGED_DURING_EXPORT/.test(worker),
  'backup source-revision stabilization appears to use an unbounded retry loop');

if (failures.length) {
  console.error('P1-207 backup source revision source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-207 backup source revision source gate: PASS');
