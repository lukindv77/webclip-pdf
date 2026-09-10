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
function around(text, anchor, radius = 1400) {
  const i = text.indexOf(anchor);
  assert.ok(i >= 0, `anchor missing: ${anchor}`);
  return text.slice(Math.max(0, i - radius), Math.min(text.length, i + anchor.length + radius));
}
function functionBody(text, signature, nextLimit = 9000) {
  const i = text.indexOf(signature);
  assert.ok(i >= 0, `function missing: ${signature}`);
  return text.slice(i, Math.min(text.length, i + nextLimit));
}

const sites = [
  { id: 'C01', name: 'page-upload', cls: 'M1', readLike: false, mutationExpected: true },
  { id: 'C02', name: 'journal-read-move', cls: 'M1', readLike: false, mutationExpected: true },
  { id: 'C03', name: 'journal-backup-upload', cls: 'M1', readLike: false, mutationExpected: true },
  { id: 'C04', name: 'pending-backup-recovery', cls: 'H2', readLike: true, mutationExpected: false },
  { id: 'C05', name: 'list-journal-backups', cls: 'H1', readLike: true, mutationExpected: false },
  { id: 'C06', name: 'selected-backup-import', cls: 'H1', readLike: true, mutationExpected: false },
  { id: 'C07', name: 'root-settings-provision', cls: 'M2', readLike: false, mutationExpected: true },
  { id: 'C08', name: 'test-connection', cls: 'H1', readLike: true, mutationExpected: false },
];

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
function canProvision(site, admittedEffect = false) {
  if (site.cls === 'H1' || site.cls === 'H2') return false;
  return Boolean(admittedEffect);
}
function recoveryTarget(checkpoint, currentRoot) {
  if (!checkpoint?.root || !checkpoint?.target) return { ok: false, reason: 'HISTORICAL_IDENTITY_INSUFFICIENT' };
  return { ok: true, root: checkpoint.root, target: checkpoint.target, currentRootIsDiagnosticOnly: currentRoot !== checkpoint.root, mutating: false };
}
function rootMutationResult(config, provisioning) {
  return { config, provisioning };
}

// Canonical ownership and tranche boundaries.
check('O01 P1-138 active', () => has(REGISTRY, '| P1-138 | ACTIVE |'));
check('O02 P1-138 wording', () => has(REGISTRY, 'Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority'));
check('O03 no new P code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O04 research only', () => has(EVIDENCE, 'RESEARCH-ONLY / CURRENT-SOURCE CALL-SITE CENSUS'));
check('O05 runtime none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O06 real L5 not run', () => has(EVIDENCE, 'Real Yandex L5: **NOT RUN**'));
check('O07 S2 none', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O08 manifest unchanged', () => assert.equal(MANIFEST.version, '0.9.8'));
check('O09 baseline pinned', () => has(EVIDENCE, '039f90ed21e44c1939684ee3bf5444651fb20770'));

// Exact source census: one definition + eight semantic callers.
check('S01 ensure service helper definition exists', () => has(SOURCE, 'async function ensureYandexServiceFolders('));
check('S02 ensure service literal occurrences are definition plus eight callers', () => assert.equal(count(SOURCE, 'ensureYandexServiceFolders('), 9));
check('S03 eight semantic consumers modeled', () => assert.equal(sites.length, 8));
check('S04 unique census ids', () => assert.equal(new Set(sites.map((s) => s.id)).size, 8));
check('S05 direct hidden H1 count', () => assert.equal(sites.filter((s) => s.cls === 'H1').length, 3));
check('S06 recovery H2 count', () => assert.equal(sites.filter((s) => s.cls === 'H2').length, 1));
check('S07 expected mutation M1 count', () => assert.equal(sites.filter((s) => s.cls === 'M1').length, 3));
check('S08 ancillary mutation M2 count', () => assert.equal(sites.filter((s) => s.cls === 'M2').length, 1));

// Concrete current call sites.
const testConnection = functionBody(SOURCE, 'async function testYandexConnection()');
check('C01 test connection performs account read', () => has(testConnection, "const info = await yandexApi('')"));
check('C02 test connection calls ensure', () => has(testConnection, 'ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true })'));

const listBackups = functionBody(SOURCE, "async function listJournalBackupsOnYandex(requestedMonth = '')");
check('C03 list backups calls ensure', () => has(listBackups, 'ensureYandexServiceFolders({ includeBackup: true })'));
check('C04 list backups is read/list family', () => has(listBackups, 'selectedMonth'));

const recoverBackup = functionBody(SOURCE, "async function recoverPendingJournalBackup(status, operationId = '')");
check('C05 pending backup recovery calls ensure', () => has(recoverBackup, 'ensureYandexServiceFolders({ includeBackup: true, operationId })'));
check('C06 recovery has pending remote path', () => has(recoverBackup, 'pending?.remotePath'));

const backupUpload = functionBody(SOURCE, 'async function uploadJournalExportStagedToYandex(');
check('C07 backup upload calls ensure', () => has(backupUpload, 'ensureYandexServiceFolders({ includeBackup: true, operationId })'));
check('C08 backup upload is mutation pipeline', () => has(backupUpload, 'stagingKey'));

check('C09 selected backup import preflight calls ensure nearby', () => {
  const w = around(SOURCE, 'Восстановление журнала с Яндекс Диска', 5000);
  has(w, 'ensureYandexServiceFolders({ includeBackup: true, operationId })');
});
check('C10 selected backup validates remote path', () => {
  const w = around(SOURCE, 'Восстановление журнала с Яндекс Диска', 5000);
  has(w, "if (!remotePath) throw new Error('Выберите конкретный файл резервной копии для импорта.')");
});

check('C11 root mutation calls ensure nearby', () => {
  const w = around(SOURCE, 'Проверяем и при необходимости создаём обе служебные ветки сразу.', 2500);
  has(w, 'ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true })');
});
check('C12 page upload calls ensure nearby', () => {
  const w = around(SOURCE, 'Проверяем доступ к Яндекс Диску и служебной папке', 2500);
  has(w, 'ensureYandexServiceFolders({');
});
check('C13 journal remote move calls ensure nearby', () => {
  const w = around(SOURCE, 'assertManagedYandexSourcePath(sourcePath, config.rootPath', 3000);
  has(w, 'ensureYandexServiceFolders({ includeUpload: true, operationId })');
});

// Provisioning helper is physically mutating.
const ensureService = functionBody(SOURCE, 'async function ensureYandexServiceFolders(');
const ensureTree = functionBody(SOURCE, "async function ensureYandexFolderTree(path, operationId = '')");
check('P01 service helper delegates to folder tree', () => has(ensureService, 'ensureYandexFolderTree('));
check('P02 folder tree issues PUT', () => has(ensureTree, "method: 'PUT'"));
check('P03 folder tree uses resources endpoint', () => has(ensureTree, "yandexApi('/resources'"));
check('P04 409 branch reads exact resource', () => has(ensureTree, "if (Number(error?.status) !== 409) throw error;"));
check('P05 409 branch verifies dir', () => has(ensureTree, "if (existing?.type !== 'dir')"));

// Census classification contract.
check('K01 C01 M1', () => assert.equal(sites.find((s) => s.id === 'C01').cls, 'M1'));
check('K02 C02 M1', () => assert.equal(sites.find((s) => s.id === 'C02').cls, 'M1'));
check('K03 C03 M1', () => assert.equal(sites.find((s) => s.id === 'C03').cls, 'M1'));
check('K04 C04 H2', () => assert.equal(sites.find((s) => s.id === 'C04').cls, 'H2'));
check('K05 C05 H1', () => assert.equal(sites.find((s) => s.id === 'C05').cls, 'H1'));
check('K06 C06 H1', () => assert.equal(sites.find((s) => s.id === 'C06').cls, 'H1'));
check('K07 C07 M2', () => assert.equal(sites.find((s) => s.id === 'C07').cls, 'M2'));
check('K08 C08 H1', () => assert.equal(sites.find((s) => s.id === 'C08').cls, 'H1'));
check('K09 hidden read sites cannot provision', () => sites.filter((s) => s.cls === 'H1').forEach((s) => assert.equal(canProvision(s, true), false)));
check('K10 recovery site cannot provision before reconcile', () => assert.equal(canProvision(sites.find((s) => s.id === 'C04'), true), false));
check('K11 expected mutation requires admission', () => assert.equal(canProvision(sites.find((s) => s.id === 'C01'), false), false));
check('K12 expected mutation may provision after admission', () => assert.equal(canProvision(sites.find((s) => s.id === 'C01'), true), true));
check('K13 root ancillary provisioning needs admission', () => assert.equal(canProvision(sites.find((s) => s.id === 'C07'), false), false));
check('K14 root ancillary provisioning admitted separately', () => assert.equal(canProvision(sites.find((s) => s.id === 'C07'), true), true));

// Pure namespace derivation separates path calculation from side effect.
const ns = deriveNamespace('/Root');
check('N01 namespace derives root', () => assert.equal(ns.rootPath, '/Root'));
check('N02 namespace derives upload path', () => assert.equal(ns.uploadPath, '/Root/Upload'));
check('N03 namespace derives read later path', () => assert.equal(ns.readLaterPath, '/Root/ReadmeLater'));
check('N04 namespace derives backup path', () => assert.equal(ns.backupPath, '/Root/Backup'));
check('N05 namespace derives journal path', () => assert.equal(ns.journalPath, '/Root/Backup/Journal'));
check('N06 namespace derivation has zero network effects', () => assert.equal(ns.networkEffects, 0));
check('N07 namespace derivation grants no mutation authority', () => assert.equal(ns.mutationAuthority, false));
check('N08 evidence distinguishes derive vs ensure', () => has(EVIDENCE, 'derive namespace != ensure namespace exists'));

// Recovery historical namespace outranks current-root repair.
const checkpoint = { root: '/R1', target: '/R1/Backup/Journal/file.json' };
check('R01 old R1 target preserved under current R2', () => assert.equal(recoveryTarget(checkpoint, '/R2').target, checkpoint.target));
check('R02 old R1 root preserved under current R2', () => assert.equal(recoveryTarget(checkpoint, '/R2').root, '/R1'));
check('R03 current R2 diagnostic only', () => assert.equal(recoveryTarget(checkpoint, '/R2').currentRootIsDiagnosticOnly, true));
check('R04 recovery is read-only', () => assert.equal(recoveryTarget(checkpoint, '/R2').mutating, false));
check('R05 missing historical root fails', () => assert.equal(recoveryTarget({ target: '/x' }, '/R2').reason, 'HISTORICAL_IDENTITY_INSUFFICIENT'));
check('R06 missing historical target fails', () => assert.equal(recoveryTarget({ root: '/R1' }, '/R2').ok, false));
check('R07 evidence forbids current ensure before old reconciliation', () => has(EVIDENCE, 'Never call current-R2 `ensure` as a prerequisite'));

// Root settings truth must be split from remote provisioning truth.
check('T01 root saved plus provisioning success', () => assert.deepEqual(rootMutationResult('saved', 'success'), { config: 'saved', provisioning: 'success' }));
check('T02 root saved plus provisioning failure', () => assert.deepEqual(rootMutationResult('saved', 'failed-before-effect'), { config: 'saved', provisioning: 'failed-before-effect' }));
check('T03 root saved plus provisioning unknown', () => assert.equal(rootMutationResult('saved', 'unknown').config, 'saved'));
check('T04 root failure means provisioning not started', () => assert.deepEqual(rootMutationResult('failed', 'not-started'), { config: 'failed', provisioning: 'not-started' }));
check('T05 evidence names separate truths', () => has(EVIDENCE, 'root config commit\nremote service provisioning'));

// Source cutover order and safety boundaries are explicit.
[
  'introduce non-mutating service-path derivation / namespace descriptor',
  'make pure list/test/read consumers use descriptor + GET only',
  'make historical recovery consume checkpoint namespace rather than current ensure',
  'introduce admitted service-folder provisioning effect API',
  'migrate explicit mutation pipelines C01/C02/C03 to that effect API',
  'split root-save config truth from ancillary provisioning result',
  'remove/lock generic ensure access from observation adapters',
  'M1 expected-mutation',
  'M2 ancillary-mutation',
  'H1 hidden-read-mutation',
  'H2 recovery-preemption'
].forEach((needle, i) => check(`X${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

// Negative contract highlights.
check('Z01 listing missing root must not imply create', () => has(EVIDENCE, 'A 404/missing root is read evidence. It is not provisioning consent.'));
check('Z02 import preflight must not create missing root', () => has(EVIDENCE, 'do not create it during import preflight'));
check('Z03 test preferred observation only', () => has(EVIDENCE, 'WEBCLIP_YANDEX_TEST = observation only'));
check('Z04 recovery insufficient identity fails closed', () => has(EVIDENCE, 'If historical identity is insufficient, recovery defers/fails closed.'));
check('Z05 runtime not modified', () => lacks(SOURCE, 'webclip-p1-138-hidden-provisioning-census/v1'));
check('Z06 release boundary', () => has(EVIDENCE, 'P1-231 S2 activation != release readiness'));
check('Z07 no official zip', () => has(EVIDENCE, 'no official ZIP'));
check('Z08 readiness untouched', () => has(EVIDENCE, 'V1 readiness and release authority are untouched.'));

console.log(`P1-138 hidden Yandex provisioning census model: PASS; cases=${cases}; schema=webclip-p1-138-hidden-provisioning-census/v1; baseline=039f90ed21e44c1939684ee3bf5444651fb20770; ensure_occurrences=9; semantic_call_sites=8; M1=3; M2=1; H1=3; H2=1; direct_hidden=test-connection,list-backups,selected-backup-import; recovery_preemption=pending-backup-recovery; namespace_derivation=pure; historical_root=checkpoint-authority; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
