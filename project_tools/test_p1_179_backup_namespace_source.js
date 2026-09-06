'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 32000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/BACKUP_NAMESPACE_VERSION|backupNamespace|yandexAccountRootScope/.test(worker),
  'missing versioned backup account/root namespace');

const acquireLease = functionSlice('acquireJournalBackupLease');
requireSource(Boolean(acquireLease), 'cannot locate acquireJournalBackupLease()');
requireSource(/accountUid|backupNamespace|yandexAccountRootScope/.test(acquireLease),
  'backup lease is not bound to account/root namespace');
requireSource(/rootPath|backupNamespace|yandexAccountRootScope/.test(acquireLease),
  'backup lease lacks root namespace authority');

const recover = functionSlice('recoverPendingJournalBackup');
requireSource(Boolean(recover), 'cannot locate recoverPendingJournalBackup()');
requireSource(/accountUid|backupNamespace|yandexAccountRootScope/.test(recover),
  'backup recovery does not inspect stored account namespace');
requireSource(/rootPath|backupNamespace|yandexAccountRootScope/.test(recover),
  'backup recovery does not inspect stored root namespace');
requireSource(/deferred-foreign-namespace|namespace-mismatch|manual-missing-scope/.test(recover),
  'backup recovery lacks fail-closed mismatch/legacy outcomes');
requireSource(!/ensureYandexServiceFolders\(\{\s*includeBackup:\s*true[\s\S]{0,1800}isAllowedJournalBackupPath\(remotePath,\s*structure\.journalPath\)[\s\S]{0,1200}chrome\.storage\.local\.remove\(JOURNAL_BACKUP_PENDING_KEY\)/.test(recover),
  'backup recovery can still delete old checkpoint solely because current root path differs');

const pendingArea = worker.slice(Math.max(0, worker.indexOf("phase: 'prepared'", worker.indexOf('emitJournalBackupProgress')) - 1200), Math.max(0, worker.indexOf("phase: 'prepared'", worker.indexOf('emitJournalBackupProgress')) - 1200) + 7000);
requireSource(/accountUid|backupNamespace|yandexAccountRootScope/.test(pendingArea),
  'prepared backup checkpoint does not persist account namespace before upload');
requireSource(/rootPath|backupNamespace|yandexAccountRootScope/.test(pendingArea),
  'prepared backup checkpoint does not persist root namespace before upload');

// Positive controls: existing lease token CAS and serialized pending storage remain useful.
requireSource(/current\?\.token\s*!==\s*lease\.token/.test(functionSlice('renewJournalBackupLease', 10000)) || /current\?\.token\s*===\s*lease\.token/.test(worker),
  'existing lease token ownership positive control disappeared');
requireSource(/mutateJournalBackupPending/.test(worker),
  'serialized backup pending mutation positive control disappeared');

if (failures.length) {
  console.error('P1-179 backup namespace source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-179 backup namespace source gate: PASS');
