'use strict';
const assert = require('assert');
let cases = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); cases += 1; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); cases += 1; };
let seq = 0;
const token = (prefix) => `${prefix}-${++seq}`;

const V7_STORES = {
  entries: ['createdAt', 'urlKey', 'urlKeyCreatedAt', 'siteKeyCreatedAt'],
  urlStats: [],
  meta: [],
  pendingAppends: ['updatedAt'],
  pendingDownloads: ['updatedAt'],
  pendingRemoteSaves: ['updatedAt'],
  importStaging: ['importId', 'createdAt']
};

const V8_NEW_STORES = {
  journalFinalizations: ['state', 'updatedAt', 'physicalOperationId', 'urlKeyState', 'siteKeyState'],
  pendingRemoteMutations: ['phase', 'updatedAt', 'physicalOperationId', 'finalizationId', 'phaseUpdatedAt']
};

function cloneValue(value) {
  return structuredClone(value);
}

function makeV7() {
  return {
    version: 7,
    stores: cloneValue(V7_STORES),
    meta: { revision: 'JR-legacy' },
    rows: {
      entries: new Map([
        ['e1', { id: 'e1', title: 'A', urlKey: 'u1', siteKey: 's1' }],
        ['e2', {
          id: 'e2', title: 'B', urlKey: 'u2', siteKey: 's2',
          readMovePendingAt: 123,
          readMoveTargetPath: '/legacy-target'
        }]
      ]),
      pendingRemoteSaves: new Map([
        ['r1', { id: 'r1', phase: 'prepared', data: { journalEntryId: 'e1' } }]
      ]),
      pendingDownloads: new Map([
        ['d1', { downloadId: 'd1', kind: 'intent' }]
      ]),
      pendingAppends: new Map([
        ['a1', { id: 'a1' }]
      ])
    }
  };
}

function cloneDb(db) {
  const out = {
    version: db.version,
    stores: cloneValue(db.stores),
    meta: cloneValue(db.meta),
    rows: {}
  };
  for (const [name, map] of Object.entries(db.rows || {})) {
    out.rows[name] = new Map(
      [...map.entries()].map(([key, value]) => [key, cloneValue(value)])
    );
  }
  return out;
}

function ensureRows(db, name) {
  if (!db.rows[name]) db.rows[name] = new Map();
}

function upgradeV8(db, opener, { abort = false } = {}) {
  if (db.version > 8) throw new Error('VersionError');
  if (db.version === 8) return db;
  if (db.version !== 7) throw new Error('unsupported-old-version');

  const work = cloneDb(db);
  for (const [name, indexes] of Object.entries(V8_NEW_STORES)) {
    if (!work.stores[name]) work.stores[name] = [...indexes];
    ensureRows(work, name);
  }

  if (!work.meta.datasetGeneration) work.meta.datasetGeneration = token('JG');
  if (!work.meta.authorityMode) work.meta.authorityMode = 'passive-v8';
  work.meta.lastSchemaMigration = { from: 7, to: 8, opener };
  work.version = 8;

  // Model IndexedDB versionchange atomicity: abort discards schema/data/version changes.
  if (abort) return db;
  return work;
}

function schemaSignature(db) {
  return JSON.stringify(Object.fromEntries(
    Object.entries(db.stores)
      .sort()
      .map(([name, indexes]) => [name, [...indexes].sort()])
  ));
}

function open(db, requestedVersion) {
  if (requestedVersion < db.version) return { ok: false, code: 'VersionError' };
  return { ok: true, upgradeNeeded: requestedVersion > db.version };
}

// Worker-first and hypothetical page-first schema creation must converge exactly.
// The source specification ultimately prefers worker-only migration ownership,
// but this equality remains a useful negative control against schema drift.
const workerFirst = upgradeV8(makeV7(), 'worker');
const pageFirst = upgradeV8(makeV7(), 'journal-page');
eq(schemaSignature(workerFirst), schemaSignature(pageFirst), 'first opener must not alter final schema');
ok(workerFirst.version === 8 && pageFirst.version === 8, 'both reach v8');
ok(workerFirst.stores.journalFinalizations.includes('urlKeyState'), 'F store has scoped URL-clear index');
ok(workerFirst.stores.journalFinalizations.includes('siteKeyState'), 'F store has scoped site-clear index');
ok(workerFirst.stores.pendingRemoteMutations.includes('phaseUpdatedAt'), 'effect store supports phase-fair recovery');
ok(Boolean(workerFirst.meta.datasetGeneration), 'JG seeded');
ok(workerFirst.meta.authorityMode === 'passive-v8', 'migration is passive');

// Existing data is preserved. Migration must not fabricate stronger authority.
ok(workerFirst.rows.entries.size === 2, 'entries preserved');
ok(!workerFirst.rows.entries.get('e1').entryRevision, 'no eager ER backfill');
ok(workerFirst.rows.entries.get('e2').readMoveTargetPath === '/legacy-target', 'legacy embedded Mark Read checkpoint preserved');
ok(workerFirst.rows.pendingRemoteSaves.has('r1'), 'legacy remote save checkpoint preserved');
ok(workerFirst.rows.pendingDownloads.has('d1'), 'legacy download checkpoint preserved');
ok(workerFirst.rows.pendingAppends.has('a1'), 'legacy append checkpoint preserved');
ok(workerFirst.rows.pendingRemoteMutations.size === 0, 'legacy remote save not promoted to exact remote mutation');
ok(workerFirst.rows.journalFinalizations.size === 0, 'no F fabricated for historical operations');

// Aborted upgrade is atomic.
const abortBase = makeV7();
const aborted = upgradeV8(abortBase, 'worker', { abort: true });
ok(aborted.version === 7, 'aborted upgrade keeps version 7');
ok(!aborted.stores.journalFinalizations, 'aborted upgrade exposes no partial store');
ok(!aborted.meta.datasetGeneration, 'aborted upgrade exposes no JG');

// Re-open of v8 must not rotate dataset generation.
const originalJg = workerFirst.meta.datasetGeneration;
const reopened = upgradeV8(workerFirst, 'journal-page');
ok(reopened.meta.datasetGeneration === originalJg, 'reopen v8 preserves JG');

// Literal package rollback boundary.
ok(open(workerFirst, 7).code === 'VersionError', 'old v7 opener cannot open upgraded DB');
ok(open(workerFirst, 8).ok === true, 'v8 opener succeeds');

// Abstract blocked/timeout schedule. A locally timed-out open must not perform
// a late upgrade after its original caller already observed failure.
let blockedDb = makeV7();
let oldConnectionOpen = true;
let timedOutRequestSettled = false;
const attemptUpgrade = () => {
  if (oldConnectionOpen) return { blocked: true };
  if (timedOutRequestSettled) return { abortedLate: true };
  blockedDb = upgradeV8(blockedDb, 'worker');
  return { upgraded: true };
};
ok(attemptUpgrade().blocked, 'open v7 connection blocks v8');
ok(blockedDb.version === 7, 'blocked request does not migrate');
timedOutRequestSettled = true;
oldConnectionOpen = false;
ok(attemptUpgrade().abortedLate, 'timed-out request must not migrate later');
ok(blockedDb.version === 7, 'late aborted request leaves v7');
timedOutRequestSettled = false;
ok(attemptUpgrade().upgraded, 'fresh retry upgrades after blocker closes');
ok(blockedDb.version === 8, 'fresh retry reaches v8');

// Legacy ER bridge: rows without persisted entryRevision use the current JR as
// a conservative migration fence until the first successful CAS writes real ER.
function readAuthority(db, id) {
  const entry = db.rows.entries.get(id);
  if (!entry) return null;
  return {
    id,
    JG: db.meta.datasetGeneration,
    ER: entry.entryRevision || 'legacy-v7',
    legacyJR: entry.entryRevision ? '' : (db.meta.revision || 'legacy-revision-absent')
  };
}

function touchJR(db) {
  db.meta.revision = token('JR');
}

function casUpdate(db, authority, patch) {
  if (authority.JG !== db.meta.datasetGeneration) return { ok: false, code: 'JG_STALE' };
  const entry = db.rows.entries.get(authority.id);
  if (!entry) return { ok: false, code: 'MISSING' };

  if (authority.ER === 'legacy-v7') {
    if (entry.entryRevision) return { ok: false, code: 'ER_STALE' };
    if ((db.meta.revision || 'legacy-revision-absent') !== authority.legacyJR) {
      return { ok: false, code: 'LEGACY_JR_STALE' };
    }
  } else if (entry.entryRevision !== authority.ER) {
    return { ok: false, code: 'ER_STALE' };
  }

  const next = { ...entry, ...patch, id: entry.id, entryRevision: token('ER') };
  db.rows.entries.set(entry.id, next);
  touchJR(db);
  return { ok: true, entry: next };
}

const casDb = upgradeV8(makeV7(), 'worker');
const legacyAuthority = readAuthority(casDb, 'e1');
ok(legacyAuthority.ER === 'legacy-v7', 'legacy row authority explicit');
ok(legacyAuthority.legacyJR === 'JR-legacy', 'legacy authority captures JR');
touchJR(casDb);
ok(casUpdate(casDb, legacyAuthority, { title: 'X' }).code === 'LEGACY_JR_STALE', 'legacy row cannot ignore intervening Journal mutation');

const freshLegacyAuthority = readAuthority(casDb, 'e1');
const firstCas = casUpdate(casDb, freshLegacyAuthority, { title: 'C' });
ok(firstCas.ok && firstCas.entry.entryRevision.startsWith('ER-'), 'first CAS persists real ER');

const realAuthority = readAuthority(casDb, 'e1');
ok(realAuthority.legacyJR === '' && realAuthority.ER.startsWith('ER-'), 'real ER removes global JR bridge');
const duplicateAuthority = { ...realAuthority };
const secondCas = casUpdate(casDb, realAuthority, { title: 'D' });
ok(secondCas.ok, 'real ER CAS succeeds');
ok(casUpdate(casDb, duplicateAuthority, { title: 'E' }).code === 'ER_STALE', 'second concurrent receipt fails');

// Dataset generation semantics.
const jgBefore = casDb.meta.datasetGeneration;
function scopedClear(db, urlKey) {
  for (const [id, entry] of db.rows.entries) {
    if (entry.urlKey === urlKey) db.rows.entries.delete(id);
  }
  touchJR(db);
}
function fullReplace(db, rows) {
  db.rows.entries = new Map(rows.map((entry) => [entry.id, entry]));
  db.meta.datasetGeneration = token('JG');
  touchJR(db);
}

scopedClear(casDb, 'u2');
ok(casDb.meta.datasetGeneration === jgBefore, 'scoped clear does not rotate JG');
const staleBeforeReplace = readAuthority(casDb, 'e1');
fullReplace(casDb, [{ id: 'e1', title: 'replacement', urlKey: 'u1', siteKey: 's1' }]);
ok(casDb.meta.datasetGeneration !== jgBefore, 'full replace rotates JG');
ok(casUpdate(casDb, staleBeforeReplace, { title: 'bad' }).code === 'JG_STALE', 'old authority cannot touch replacement with same id');

// Runtime schema integrity gate.
function verifyV8(db) {
  const required = ['entries', 'meta', 'journalFinalizations', 'pendingRemoteMutations'];
  if (db.version !== 8) return { ok: false, code: 'VERSION' };
  for (const store of required) {
    if (!db.stores[store]) return { ok: false, code: `MISSING_STORE:${store}` };
  }
  if (!db.meta.datasetGeneration) return { ok: false, code: 'MISSING_JG' };
  if (db.meta.authorityMode !== 'passive-v8' && db.meta.authorityMode !== 'cas-v1') {
    return { ok: false, code: 'AUTHORITY_MODE' };
  }
  return { ok: true };
}

ok(verifyV8(workerFirst).ok, 'healthy v8 passes integrity gate');
const brokenStore = cloneDb(workerFirst);
delete brokenStore.stores.pendingRemoteMutations;
ok(verifyV8(brokenStore).code === 'MISSING_STORE:pendingRemoteMutations', 'missing store fails closed');
const brokenJg = cloneDb(workerFirst);
delete brokenJg.meta.datasetGeneration;
ok(verifyV8(brokenJg).code === 'MISSING_JG', 'missing JG fails closed');

// J0 migration and D0 authority activation are deliberately separate.
const activation = cloneDb(workerFirst);
ok(activation.meta.authorityMode === 'passive-v8', 'J0 not authority activation');
activation.meta.authorityMode = 'cas-v1';
ok(activation.meta.authorityMode === 'cas-v1', 'D0 activation can be explicit later');

console.log(`Wave 1 Journal v8 migration model: PASS cases=${cases}`);
