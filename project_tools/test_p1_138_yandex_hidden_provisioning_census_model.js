'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_138_YANDEX_HIDDEN_PROVISIONING_CENSUS_2026-09-10_EVIDENCE.md'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let cases = 0;
function check(name, fn) {
  try { fn(); cases += 1; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }
function count(text, needle) { return text.split(needle).length - 1; }
function asyncSection(signature) {
  const start = SOURCE.indexOf(signature);
  assert.ok(start >= 0, `function missing: ${signature}`);
  const next = SOURCE.indexOf('\nasync function ', start + signature.length);
  return SOURCE.slice(start, next >= 0 ? next : SOURCE.length);
}
function matches(re, label) { assert.ok(re.test(SOURCE), `source sequence missing: ${label}`); }

const sites = [
  ['C01', 'page-upload', 'M1'],
  ['C02', 'journal-read-move', 'M1'],
  ['C03', 'journal-backup-upload', 'M1'],
  ['C04', 'pending-backup-recovery', 'H2'],
  ['C05', 'list-journal-backups', 'H1'],
  ['C06', 'selected-backup-import', 'H1'],
  ['C07', 'root-settings-provision', 'M2'],
  ['C08', 'test-connection', 'H1'],
].map(([id, name, cls]) => ({ id, name, cls }));

function deriveNamespace(root = '/WebClip') {
  const clean = String(root || '').replace(/\/+$/, '') || '/';
  return Object.freeze({
    rootPath: clean,
    uploadPath: `${clean}/Upload`.replace('//', '/'),
    readLaterPath: `${clean}/ReadmeLater`.replace('//', '/'),
    backupPath: `${clean}/Backup`.replace('//', '/'),
    journalPath: `${clean}/Backup/Journal`.replace('//', '/'),
    networkEffects: 0,
    mutationAuthority: false,
  });
}
function canProvision(site, admitted) {
  return site.cls === 'M1' || site.cls === 'M2' ? Boolean(admitted) : false;
}
function recover(checkpoint, live) {
  if (!checkpoint?.accountUid || !checkpoint?.rootPath || !checkpoint?.remotePath) {
    return { outcome: 'historical-identity-insufficient', remoteCall: false };
  }
  if (checkpoint.accountUid !== live.accountUid) return { outcome: 'foreign-account', remoteCall: false };
  return {
    outcome: 'read-only-reconcile',
    rootPath: checkpoint.rootPath,
    remotePath: checkpoint.remotePath,
    currentRootDiagnosticOnly: checkpoint.rootPath !== live.rootPath,
    remoteCall: true,
    mutating: false,
  };
}

// Canonical owner/scope checks.
check('O01 P1-138 active', () => has(REGISTRY, '| P1-138 | ACTIVE |'));
check('O02 P1-138 hidden provisioning owner', () => has(REGISTRY, 'Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority'));
check('O03 P1-179 active', () => has(REGISTRY, '| P1-179 | ACTIVE |'));
check('O04 P1-179 namespace owner', () => has(REGISTRY, 'Backup scheduler state and pending backup checkpoint are immutable account/root namespaces'));
check('O05 evidence includes P1-179', () => has(EVIDENCE, 'P1-179  backup scheduler/pending checkpoint immutable account/root namespace'));
check('O06 no new P code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O07 research only', () => has(EVIDENCE, 'RESEARCH-ONLY / CURRENT-SOURCE CALL-SITE CENSUS'));
check('O08 runtime none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O09 real L5 not run', () => has(EVIDENCE, 'Real Yandex L5: **NOT RUN**'));
check('O10 release policy untouched', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O11 manifest remains 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('O12 baseline pinned', () => has(EVIDENCE, '039f90ed21e44c1939684ee3bf5444651fb20770'));

// Exact source cardinality and helper mutation proof.
check('S01 ensure definition exists', () => has(SOURCE, 'async function ensureYandexServiceFolders('));
check('S02 exact ensure cardinality 1+8', () => assert.equal(count(SOURCE, 'ensureYandexServiceFolders('), 9));
check('S03 exactly eight semantic consumers modeled', () => assert.equal(sites.length, 8));
check('S04 census IDs unique', () => assert.equal(new Set(sites.map((s) => s.id)).size, 8));
check('S05 M1=3', () => assert.equal(sites.filter((s) => s.cls === 'M1').length, 3));
check('S06 M2=1', () => assert.equal(sites.filter((s) => s.cls === 'M2').length, 1));
check('S07 H1=3', () => assert.equal(sites.filter((s) => s.cls === 'H1').length, 3));
check('S08 H2=1', () => assert.equal(sites.filter((s) => s.cls === 'H2').length, 1));
const ensureService = asyncSection('async function ensureYandexServiceFolders(');
const ensureTree = asyncSection("async function ensureYandexFolderTree(path, operationId = '')");
check('S09 service helper delegates to folder tree', () => has(ensureService, 'ensureYandexFolderTree('));
check('S10 folder tree can PUT', () => has(ensureTree, "method: 'PUT'"));
check('S11 folder tree uses resources endpoint', () => has(ensureTree, "yandexApi('/resources'"));

// Direct H1/H2 call sites, extracted by semantic function rather than fixed windows.
const testConnection = asyncSection('async function testYandexConnection()');
check('C01 test connection observes account through exact-auth receipt read', () => has(testConnection, "const result = await yandexApi('', { includeAuthRequestReceipt: true })"));
check('C02 test connection hides ensure today', () => has(testConnection, 'ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true })'));
const listBackups = asyncSection("async function listJournalBackupsOnYandex(requestedMonth = '')");
check('C03 list backups hides ensure today', () => has(listBackups, 'ensureYandexServiceFolders({ includeBackup: true })'));
const recoverPending = asyncSection("async function recoverPendingJournalBackup(status, operationId = '', { operationContext = null, beforeRemoteChild = null } = {})");
check('C04 recovery reads pending path', () => has(recoverPending, 'pending?.remotePath'));
check('C05 recovery provisions before reconcile today', () => has(recoverPending, 'ensureYandexServiceFolders({
    includeBackup: true, operationId, operationContext, beforeRemoteChild
  })'));
const fetchBackup = asyncSection("async function fetchJournalBackupFromYandex(requestedPath, operationId = '', ownerSessionId = '')");
check('C06 selected import validates path', () => has(fetchBackup, "if (!remotePath) throw new Error('Выберите конкретный файл резервной копии для импорта.')"));
check('C07 selected import hides ensure today', () => has(fetchBackup, 'ensureYandexServiceFolders({
    includeBackup: true, operationId, operationContext, beforeRemoteChild
  })'));
const backupUpload = asyncSection('async function uploadJournalExportStagedToYandex(');
check('C08 backup upload legitimately provisions', () => has(backupUpload, 'ensureYandexServiceFolders({
    includeBackup: true, operationId, operationContext, beforeRemoteChild
  })'));

// Remaining three semantic consumers are bound by ordered source sequences.
check('C09 root-setting ancillary provisioning', () => matches(/config\.rootPath\s*=\s*normalized[\s\S]{0,2200}ensureYandexServiceFolders\(\{\s*includeUpload:\s*true,\s*includeReadLater:\s*true,\s*includeBackup:\s*true\s*\}\)/, 'root config commit -> ancillary ensure'));
check('C10 page upload provisioning', () => matches(/emitPageUploadProgress\([^\n]*disk-access[\s\S]{0,1200}ensureYandexServiceFolders\(\{[\s\S]{0,500}includeUpload:\s*readingMode\s*===\s*'read'[\s\S]{0,500}includeReadLater:\s*readingMode\s*===\s*'later'/, 'page upload -> admitted service branch candidate'));
check('C11 journal read-state move provisioning', () => matches(/assertManagedYandexSourcePath\(sourcePath,\s*config\.rootPath,\s*\[YANDEX_READ_LATER_DIR,\s*YANDEX_UPLOAD_DIR\]\)[\s\S]{0,1000}ensureYandexServiceFolders\(\{[\s\S]{0,500}includeUpload:\s*true[\s\S]{0,500}operationContext/, 'read-state move -> upload branch ensure'));

// Classification/admission model.
for (const site of sites.filter((s) => s.cls === 'H1' || s.cls === 'H2')) {
  check(`A-${site.id} hidden/recovery site has no provisioning authority`, () => assert.equal(canProvision(site, true), false));
}
for (const site of sites.filter((s) => s.cls === 'M1' || s.cls === 'M2')) {
  check(`A-${site.id}-blocked without admission`, () => assert.equal(canProvision(site, false), false));
  check(`A-${site.id}-allowed with admission`, () => assert.equal(canProvision(site, true), true));
}

// Pure path derivation is not existence proof or mutation capability.
const ns = deriveNamespace('/R');
check('N01 root derived', () => assert.equal(ns.rootPath, '/R'));
check('N02 upload derived', () => assert.equal(ns.uploadPath, '/R/Upload'));
check('N03 read-later derived', () => assert.equal(ns.readLaterPath, '/R/ReadmeLater'));
check('N04 backup derived', () => assert.equal(ns.backupPath, '/R/Backup'));
check('N05 journal derived', () => assert.equal(ns.journalPath, '/R/Backup/Journal'));
check('N06 derivation performs no I/O', () => assert.equal(ns.networkEffects, 0));
check('N07 derivation grants no mutation', () => assert.equal(ns.mutationAuthority, false));
check('N08 evidence separates derive from ensure', () => has(EVIDENCE, 'derive namespace != ensure namespace exists'));

// Historical namespace outranks current-root retargeting.
const old = { accountUid: 'A', rootPath: '/R1', remotePath: '/R1/Backup/Journal/a.json' };
check('R01 same account/new root reads old target', () => assert.equal(recover(old, { accountUid: 'A', rootPath: '/R2' }).outcome, 'read-only-reconcile'));
check('R02 old root retained', () => assert.equal(recover(old, { accountUid: 'A', rootPath: '/R2' }).rootPath, '/R1'));
check('R03 current root diagnostic only', () => assert.equal(recover(old, { accountUid: 'A', rootPath: '/R2' }).currentRootDiagnosticOnly, true));
check('R04 reconciliation non-mutating', () => assert.equal(recover(old, { accountUid: 'A', rootPath: '/R2' }).mutating, false));
check('R05 different account cannot probe', () => assert.equal(recover(old, { accountUid: 'B', rootPath: '/R1' }).remoteCall, false));
check('R06 missing account fails closed', () => assert.equal(recover({ rootPath: '/R1', remotePath: '/x' }, { accountUid: 'A', rootPath: '/R1' }).outcome, 'historical-identity-insufficient'));
check('R07 evidence forbids current ensure prerequisite', () => has(EVIDENCE, 'Never call current-R2 `ensure` as a prerequisite'));

// Evidence cutover and boundary contract.
[
  'introduce non-mutating service-path derivation / namespace descriptor',
  'make pure list/test/read consumers use descriptor + GET only',
  'make historical recovery consume checkpoint namespace rather than current ensure',
  'introduce admitted service-folder provisioning effect API',
  'migrate explicit mutation pipelines C01/C02/C03 to that effect API',
  'split root-save config truth from ancillary provisioning result',
  'remove/lock generic ensure access from observation adapters',
  'A 404/missing root is read evidence. It is not provisioning consent.',
  'WEBCLIP_YANDEX_TEST = observation only',
  'If historical identity is insufficient, recovery defers/fails closed.',
  'V1 readiness and release authority are untouched.'
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));
check('E12 runtime marker absent', () => lacks(SOURCE, 'webclip-p1-138-hidden-provisioning-census/v1'));

console.log(`P1-138 hidden Yandex provisioning census model: PASS; cases=${cases}; schema=webclip-p1-138-hidden-provisioning-census/v1; baseline=039f90ed21e44c1939684ee3bf5444651fb20770; ensure_occurrences=9; semantic_call_sites=8; M1=3; M2=1; H1=3; H2=1; p1_179_namespace_owner=true; extraction=structure-stable; namespace_derivation=pure; historical_root=checkpoint-authority; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);