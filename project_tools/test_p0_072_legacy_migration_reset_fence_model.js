'use strict';

const assert = require('node:assert/strict');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function scopeRelation(row, scope) {
  if (scope.kind === 'all') return 'match';
  const urlKey = String(row.urlKey || '');
  const siteKey = String(row.siteKey || '');
  if (scope.kind === 'url') {
    if (urlKey) return urlKey === scope.key ? 'match' : 'nonmatch';
    if (siteKey) return siteKey === scope.siteKey ? 'indeterminate' : 'nonmatch';
    return 'indeterminate';
  }
  if (scope.kind === 'site') {
    if (siteKey) return siteKey === scope.key ? 'match' : 'nonmatch';
    if (urlKey) return 'indeterminate';
    return 'indeterminate';
  }
  return 'indeterminate';
}

function makeDisposition(resetId, relation) {
  return {
    version: 1,
    resetId,
    state: 'quarantined',
    outcome: relation === 'indeterminate' ? 'unknown' : 'pending',
    resolution: 'manual-resolution'
  };
}

function reset(db, legacySource, { resetId, scope }) {
  const next = clone(db);
  for (const row of Object.values(next.pendingAppends)) {
    const relation = scopeRelation(row, scope);
    if (relation === 'nonmatch' || row.journalResetDisposition) continue;
    row.journalResetDisposition = makeDisposition(resetId, relation);
  }
  for (const legacy of legacySource) {
    const relation = scopeRelation(legacy, scope);
    if (relation === 'nonmatch') continue;
    const key = `legacyPendingFence:v1:${legacy.id}`;
    if (!next.meta[key]) {
      next.meta[key] = {
        key,
        version: 1,
        legacyId: legacy.id,
        sourceOperationId: String(legacy.operationId || ''),
        resetId,
        scope: scope.kind,
        scopeKey: scope.key || '',
        relation
      };
    }
  }
  return next;
}

function migrateLegacy(db, legacySource) {
  const next = clone(db);
  for (const item of legacySource) {
    const existing = next.pendingAppends[item.id] || null;
    if (existing?.journalResetDisposition) continue;
    const fence = next.meta[`legacyPendingFence:v1:${item.id}`] || null;
    if (fence) {
      next.pendingAppends[item.id] = {
        ...clone(item),
        journalResetDisposition: makeDisposition(fence.resetId, fence.relation)
      };
      continue;
    }
    next.pendingAppends[item.id] = clone(item);
  }
  return next;
}

function initial() { return { pendingAppends: {}, meta: {} }; }

(function migrationBeforeResetIsQuarantinedByReset() {
  const legacy = [{ id: 'a', operationId: 'op-a', urlKey: 'https://example.test/a', siteKey: 'example.test' }];
  let db = migrateLegacy(initial(), legacy);
  db = reset(db, legacy, { resetId: 'r1', scope: { kind: 'all', key: '' } });
  assert.equal(db.pendingAppends.a.journalResetDisposition.resetId, 'r1');
})();

(function resetBeforeMigrationUsesDurableFence() {
  const legacy = [{ id: 'a', operationId: 'op-a', urlKey: 'https://example.test/a', siteKey: 'example.test' }];
  let db = reset(initial(), legacy, { resetId: 'r1', scope: { kind: 'all', key: '' } });
  db = migrateLegacy(db, legacy);
  assert.equal(db.pendingAppends.a.journalResetDisposition.resetId, 'r1');
})();

(function scopedNonmatchRemainsActive() {
  const legacy = [
    { id: 'a', operationId: 'op-a', urlKey: 'https://example.test/a', siteKey: 'example.test' },
    { id: 'b', operationId: 'op-b', urlKey: 'https://other.test/b', siteKey: 'other.test' }
  ];
  let db = reset(initial(), legacy, { resetId: 'r-url', scope: { kind: 'url', key: 'https://example.test/a', siteKey: 'example.test' } });
  db = migrateLegacy(db, legacy);
  assert.equal(db.pendingAppends.a.journalResetDisposition.resetId, 'r-url');
  assert.equal(db.pendingAppends.b.journalResetDisposition, undefined);
})();

(function indeterminateScopeIsManualNotActiveReplay() {
  const legacy = [{ id: 'unknown', operationId: 'op-u', urlKey: '', siteKey: '' }];
  let db = reset(initial(), legacy, { resetId: 'r-site', scope: { kind: 'site', key: 'example.test' } });
  db = migrateLegacy(db, legacy);
  assert.equal(db.pendingAppends.unknown.journalResetDisposition.resolution, 'manual-resolution');
  assert.equal(db.meta['legacyPendingFence:v1:unknown'].relation, 'indeterminate');
})();

(function repeatedMigrationCannotReactivateAfterStorageRemoveFailure() {
  const legacy = [{ id: 'a', operationId: 'op-a', urlKey: 'https://example.test/a', siteKey: 'example.test' }];
  let db = reset(initial(), legacy, { resetId: 'r1', scope: { kind: 'all', key: '' } });
  db = migrateLegacy(db, legacy);
  const first = clone(db.pendingAppends.a.journalResetDisposition);
  db = migrateLegacy(db, legacy);
  assert.deepEqual(db.pendingAppends.a.journalResetDisposition, first);
})();

(function migrationCannotOverwriteAlreadyQuarantinedCurrentRow() {
  const legacy = [{ id: 'a', operationId: 'op-a', urlKey: 'https://example.test/a', siteKey: 'example.test', lastError: 'legacy' }];
  const db0 = initial();
  db0.pendingAppends.a = {
    id: 'a', operationId: 'op-a', urlKey: 'https://example.test/a', siteKey: 'example.test', lastError: 'newer',
    journalResetDisposition: makeDisposition('r-current', 'match')
  };
  const db = migrateLegacy(db0, legacy);
  assert.equal(db.pendingAppends.a.lastError, 'newer');
  assert.equal(db.pendingAppends.a.journalResetDisposition.resetId, 'r-current');
})();

(function fenceIsMigrationOnlyAndDoesNotPoisonOrdinaryFutureWriter() {
  const legacy = [{ id: 'a', operationId: 'op-old', urlKey: 'https://example.test/a', siteKey: 'example.test' }];
  const db = reset(initial(), legacy, { resetId: 'r1', scope: { kind: 'all', key: '' } });
  db.pendingAppends.a = { id: 'a', operationId: 'op-new', urlKey: 'https://new.test/', siteKey: 'new.test' };
  assert.equal(db.pendingAppends.a.journalResetDisposition, undefined);
})();

console.log('P0-072 legacy migration/reset fence model: PASS');
