'use strict';
const assert = require('node:assert/strict');

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function makeDisposition(resetId, { outcome = 'pending', resolution = 'reconciling', scope = 'all' } = {}) {
  return { version: 1, resetId, kind: scope === 'all' ? 'clear-all' : `clear-${scope}`, scope,
    sourceOperationId: '', quarantinedAt: 1, state: 'quarantined', outcome, resolution, updatedAt: 1 };
}

function relation(rowScope, resetScope) {
  if (resetScope.kind === 'all') return 'match';
  if (!rowScope || rowScope.indeterminate) return 'indeterminate';
  if (resetScope.kind === 'url') return rowScope.urlKey === resetScope.key ? 'match' : 'nonmatch';
  if (resetScope.kind === 'site') return rowScope.siteKey === resetScope.key ? 'match' : 'nonmatch';
  return 'indeterminate';
}

function classifyStage(row, stageName) {
  const explicit = row.stages?.[stageName];
  if (explicit === 'prepared' || explicit === 'admitted') return explicit;
  if (stageName === 'download-start' && row.kind === 'download' && Number.isInteger(row.downloadId)) return 'admitted';
  if (row.kind === 'unknown' || row.phase === 'stale-unverified') return 'admission-unknown';
  if (stageName === 'upload' && row.phase === 'remote-verified') return 'admitted';
  return 'admission-unknown';
}

function detachRow(row, resetId, scopeKind, stageName = '') {
  if (row.journalResetDisposition) return clone(row);
  const next = clone(row);
  const stage = stageName ? classifyStage(next, stageName) : 'admission-unknown';
  let outcome = 'pending';
  let resolution = 'reconciling';
  if (next.kind === 'unknown' || next.phase === 'stale-unverified') { outcome = 'unknown'; resolution = 'manual-resolution'; }
  if (stage === 'prepared') { outcome = 'cancelled-before-start'; resolution = 'terminal'; next.stages[stageName] = 'cancelled-before-start'; }
  next.journalResetDisposition = makeDisposition(resetId, { outcome, resolution, scope: scopeKind });
  return next;
}

function hiddenLegacyKey(id) { return `legacyPendingFence:v1:${id}`; }

function atomicReset(db, { resetId, scope, legacySnapshot = [], pendingManualCap = 10, externalSaltOk = true,
  replacementEntries = null, stagedCountOk = true, forceAbort = false } = {}) {
  if (!Array.isArray(legacySnapshot) || legacySnapshot.length > 20) return { ok: false, reason: 'legacy-prerequisite', db };
  const before = clone(db);
  const next = clone(db);

  if (scope.kind !== 'all' && !externalSaltOk && Object.values(next.meta).some(r => r?.recordKind === 'external-effect')) {
    return { ok: false, reason: 'scope-token-indeterminate', db: before };
  }

  for (const storeName of ['pendingAppends', 'pendingDownloads', 'pendingRemoteSaves']) {
    next[storeName] = next[storeName].map(row => {
      const rel = relation(row.scope, scope);
      if (rel === 'nonmatch') return row;
      const stage = storeName === 'pendingDownloads' ? 'download-start' : storeName === 'pendingRemoteSaves' ? 'upload' : '';
      const detached = detachRow(row, resetId, scope.kind, stage);
      if (storeName === 'pendingAppends') {
        detached.journalResetDisposition.outcome = 'pending';
        detached.journalResetDisposition.resolution = 'manual-resolution';
      }
      if (rel === 'indeterminate') {
        detached.journalResetDisposition.outcome = 'unknown';
        detached.journalResetDisposition.resolution = 'manual-resolution';
      }
      return detached;
    });
  }

  for (const legacy of legacySnapshot) {
    const rel = relation(legacy.scope, scope);
    if (rel === 'nonmatch') continue;
    const idx = next.pendingAppends.findIndex(r => r.id === legacy.id);
    if (idx >= 0) {
      const current = next.pendingAppends[idx];
      const currentRel = relation(current.scope, scope);
      const mergedRel = currentRel === rel ? rel : 'indeterminate';
      const detached = detachRow(current, resetId, scope.kind);
      detached.journalResetDisposition.outcome = 'pending';
      detached.journalResetDisposition.resolution = 'manual-resolution';
      if (mergedRel === 'indeterminate') {
        detached.journalResetDisposition.outcome = 'unknown';
        detached.journalResetDisposition.resolution = 'manual-resolution';
      }
      next.pendingAppends[idx] = detached;
    } else {
      const materialized = detachRow({ ...clone(legacy), migratedFromLegacy: true }, resetId, scope.kind);
      materialized.journalResetDisposition.outcome = 'pending';
      materialized.journalResetDisposition.resolution = 'manual-resolution';
      if (rel === 'indeterminate') {
        materialized.journalResetDisposition.outcome = 'unknown';
        materialized.journalResetDisposition.resolution = 'manual-resolution';
      }
      next.pendingAppends.push(materialized);
    }
    next.meta[hiddenLegacyKey(legacy.id)] = { key: hiddenLegacyKey(legacy.id), version: 1, legacyId: legacy.id,
      resetId, relation: rel, createdAt: 1 };
  }

  for (const receipt of Object.values(next.meta)) {
    if (receipt?.recordKind !== 'external-effect' || receipt.resetDisposition) continue;
    const rel = scope.kind === 'all' ? 'match' : receipt.scopeRelation;
    if (rel === 'nonmatch') continue;
    if (rel !== 'match') return { ok: false, reason: 'external-scope-indeterminate', db: before };
    receipt.resetDisposition = { version: 1, resetId, scope: scope.kind, state: 'detached' };
    if (receipt.phase === 'prepared') { receipt.phase = 'cancelled-before-start'; receipt.resolution = 'terminal'; }
  }

  const manualCount = [...next.pendingAppends, ...next.pendingDownloads, ...next.pendingRemoteSaves]
    .filter(r => r.journalResetDisposition?.resolution === 'manual-resolution').length;
  if (manualCount > pendingManualCap) return { ok: false, reason: 'manual-capacity', db: before };

  if (scope.kind === 'all') next.entries = replacementEntries ? clone(replacementEntries) : [];
  else next.entries = next.entries.filter(e => relation(e.scope, scope) === 'nonmatch');

  if (!stagedCountOk || forceAbort) return { ok: false, reason: stagedCountOk ? 'forced-abort' : 'staging-mismatch', db: before };
  return { ok: true, db: next };
}

function migrateLegacyAfterReset(db, legacy) {
  const next = clone(db);
  const fence = next.meta[hiddenLegacyKey(legacy.id)];
  const idx = next.pendingAppends.findIndex(r => r.id === legacy.id);
  if (fence) {
    if (idx >= 0) return next;
    const row = detachRow({ ...clone(legacy), migratedFromLegacy: true }, fence.resetId, 'all');
    row.journalResetDisposition.outcome = 'pending';
    row.journalResetDisposition.resolution = 'manual-resolution';
    if (fence.relation === 'indeterminate') {
      row.journalResetDisposition.outcome = 'unknown';
      row.journalResetDisposition.resolution = 'manual-resolution';
    }
    next.pendingAppends.push(row);
    return next;
  }
  if (idx < 0) next.pendingAppends.push(clone(legacy));
  return next;
}

(function hiddenLegacyConsumesCapacityInsideReset() {
  const db = { entries:[{id:'e',scope:{urlKey:'u'}}], pendingAppends:[], pendingDownloads:[], pendingRemoteSaves:[], meta:{} };
  const legacy = [{ id:'l1', scope:{indeterminate:true}, operationId:'old' }];
  const failed = atomicReset(db,{resetId:'r',scope:{kind:'all'},legacySnapshot:legacy,pendingManualCap:0});
  assert.equal(failed.ok,false);
  assert.equal(failed.reason,'manual-capacity');
  assert.deepEqual(failed.db,db,'capacity failure must roll back Journal and hidden-legacy materialization together');
})();

(function resetFirstMaterializesAndFencesLegacy() {
  const db = { entries:[{id:'e',scope:{urlKey:'u'}}], pendingAppends:[], pendingDownloads:[], pendingRemoteSaves:[], meta:{} };
  const legacy = { id:'l1', scope:{urlKey:'u'}, operationId:'old' };
  const reset = atomicReset(db,{resetId:'r1',scope:{kind:'url',key:'u'},legacySnapshot:[legacy]});
  assert.equal(reset.ok,true);
  assert.equal(reset.db.pendingAppends[0].journalResetDisposition.resetId,'r1');
  const afterLateMigration = migrateLegacyAfterReset(reset.db,legacy);
  assert.equal(afterLateMigration.pendingAppends.length,1);
  assert.equal(afterLateMigration.pendingAppends[0].journalResetDisposition.resetId,'r1');
})();

(function conflictingSameIdScopeFailsSafeToManual() {
  const db = { entries:[{id:'e',scope:{urlKey:'u'}}], pendingAppends:[{id:'l1',scope:{urlKey:'other'}}], pendingDownloads:[], pendingRemoteSaves:[], meta:{} };
  const legacy = { id:'l1', scope:{urlKey:'u'} };
  const reset = atomicReset(db,{resetId:'r',scope:{kind:'url',key:'u'},legacySnapshot:[legacy]});
  assert.equal(reset.ok,true);
  assert.equal(reset.db.pendingAppends[0].journalResetDisposition.resolution,'manual-resolution');
})();

(function missingScopeSaltAbortsScopedReset() {
  const db={entries:[{id:'e',scope:{urlKey:'u'}}],pendingAppends:[],pendingDownloads:[],pendingRemoteSaves:[],meta:{
    'externalEffect:v1:x':{recordKind:'external-effect',phase:'prepared',scopeRelation:'match'}
  }};
  const out=atomicReset(db,{resetId:'r',scope:{kind:'url',key:'u'},externalSaltOk:false});
  assert.equal(out.ok,false); assert.equal(out.reason,'scope-token-indeterminate'); assert.deepEqual(out.db,db);
})();

(function legacyMissingStageIsNotPrepared() {
  const db={entries:[],pendingAppends:[],pendingDownloads:[{id:'intent:1',kind:'intent',scope:{urlKey:'u'}}],pendingRemoteSaves:[],meta:{}};
  const out=atomicReset(db,{resetId:'r',scope:{kind:'url',key:'u'}});
  assert.equal(out.ok,true);
  assert.equal(out.db.pendingDownloads[0].journalResetDisposition.outcome,'pending');
  assert.equal(out.db.pendingDownloads[0].journalResetDisposition.resolution,'reconciling');
})();

(function explicitPreparedCanBeCancelledBeforeStart() {
  const db={entries:[],pendingAppends:[],pendingDownloads:[{id:'intent:1',kind:'intent',scope:{urlKey:'u'},stages:{'download-start':'prepared'}}],pendingRemoteSaves:[],meta:{}};
  const out=atomicReset(db,{resetId:'r',scope:{kind:'url',key:'u'}});
  assert.equal(out.ok,true);
  assert.equal(out.db.pendingDownloads[0].stages['download-start'],'cancelled-before-start');
  assert.equal(out.db.pendingDownloads[0].journalResetDisposition.resolution,'terminal');
})();

(function importStagingMismatchRollsBackResetAndReplacement() {
  const db={entries:[{id:'old',scope:{urlKey:'u'}}],pendingAppends:[{id:'p',scope:{urlKey:'u'}}],pendingDownloads:[],pendingRemoteSaves:[],meta:{}};
  const out=atomicReset(db,{resetId:'r',scope:{kind:'all'},replacementEntries:[{id:'new'}],stagedCountOk:false});
  assert.equal(out.ok,false); assert.deepEqual(out.db,db);
})();

(function definiteNonmatchUnchanged() {
  const row={id:'p',scope:{urlKey:'other'},data:{x:1}};
  const db={entries:[],pendingAppends:[row],pendingDownloads:[],pendingRemoteSaves:[],meta:{}};
  const out=atomicReset(db,{resetId:'r',scope:{kind:'url',key:'u'}});
  assert.equal(out.ok,true); assert.deepEqual(out.db.pendingAppends[0],row);
})();

console.log('P0-072 atomic reset execution model: PASS');
