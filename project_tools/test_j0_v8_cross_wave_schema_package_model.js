'use strict';

const assert = require('assert');

let cases = 0;
function test(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function v7() {
  return {
    version: 7,
    migrationOwner: 'duplicated-worker-page',
    stores: {
      entries: {
        keyPath: 'id',
        indexes: ['createdAt', 'urlKey', 'urlKeyCreatedAt', 'siteKeyCreatedAt'],
        rows: [{ id: 'E1', url: 'https://example.test/a', title: 'A', legacy: true }]
      },
      urlStats: {
        keyPath: 'urlKey',
        indexes: [],
        rows: [{ urlKey: 'https://example.test/a', count: 1 }]
      },
      meta: {
        keyPath: 'key',
        indexes: [],
        rows: [{ key: 'revision', value: 'JR1' }]
      },
      pendingAppends: { keyPath: 'id', indexes: ['updatedAt'], rows: [] },
      pendingDownloads: { keyPath: 'id', indexes: ['updatedAt'], rows: [] },
      pendingRemoteSaves: {
        keyPath: 'id',
        indexes: ['updatedAt'],
        rows: [{ id: 'legacy-save-1', phase: 'remote-verified', updatedAt: 1, data: { url: 'https://example.test/a' } }]
      },
      importStaging: { keyPath: 'key', indexes: ['importId'], rows: [] }
    }
  };
}

const requiredV8 = {
  journalFinalizations: {
    keyPath: 'finalizationId',
    indexes: ['state', 'updatedAt', 'physicalOperationId', 'urlKeyState', 'siteKeyState']
  },
  pendingRemoteMutations: {
    keyPath: 'remoteEffectId',
    indexes: ['phase', 'updatedAt', 'physicalOperationId', 'finalizationId', 'phaseUpdatedAt']
  },
  urlStatsV2: {
    keyPath: ['projectionGeneration', 'urlKey'],
    indexes: ['projectionGeneration']
  },
  journalSummaries: {
    keyPath: ['projectionGeneration', 'entryId'],
    indexes: ['generationCreatedAt', 'generationUrlCreatedAt', 'generationSiteCreatedAt', 'generationReadingCreatedAt']
  }
};

const pendingRemoteSaveForwardIndexes = [
  'updatedAt',
  'phase',
  'physicalOperationId',
  'finalizationId',
  'phaseUpdatedAt'
];

function metaMap(db) {
  return new Map(db.stores.meta.rows.map((row) => [row.key, row]));
}

function setMeta(db, key, value) {
  const rows = db.stores.meta.rows;
  const idx = rows.findIndex((row) => row.key === key);
  const next = { key, value };
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
}

function getMeta(db, key) {
  return metaMap(db).get(key)?.value;
}

function addIndex(store, name) {
  if (!store.indexes.includes(name)) store.indexes.push(name);
}

function migrateV7ToV8(input, seed = 'seed1') {
  assert.strictEqual(input.version, 7, 'input must be v7');
  const db = clone(input);
  const beforeEntries = JSON.stringify(db.stores.entries.rows);
  const beforeRemote = JSON.stringify(db.stores.pendingRemoteSaves.rows);
  const beforeUrlStats = JSON.stringify(db.stores.urlStats.rows);

  db.version = 8;
  db.migrationOwner = 'service-worker-only';

  for (const [name, spec] of Object.entries(requiredV8)) {
    if (!db.stores[name]) db.stores[name] = { keyPath: clone(spec.keyPath), indexes: [], rows: [] };
    for (const index of spec.indexes) addIndex(db.stores[name], index);
  }

  for (const index of pendingRemoteSaveForwardIndexes) addIndex(db.stores.pendingRemoteSaves, index);

  if (getMeta(db, 'datasetGeneration') == null) setMeta(db, 'datasetGeneration', `JG-${seed}`);
  if (getMeta(db, 'authorityMode') == null) setMeta(db, 'authorityMode', 'passive-v8');
  if (getMeta(db, 'urlIdentityMigration') == null) {
    setMeta(db, 'urlIdentityMigration', { version: 1, generation: `UIM-${seed}`, phase: 'pending', afterEntryId: '', migratedCount: 0 });
  }
  if (getMeta(db, 'publishedUrlStatsGeneration') == null) setMeta(db, 'publishedUrlStatsGeneration', '');
  if (getMeta(db, 'urlStatsSourceRevision') == null) setMeta(db, 'urlStatsSourceRevision', '');
  if (getMeta(db, 'urlStatsState') == null) setMeta(db, 'urlStatsState', 'legacy-v1-current');
  if (getMeta(db, 'urlStatsBuildingGeneration') == null) setMeta(db, 'urlStatsBuildingGeneration', '');
  if (getMeta(db, 'publishedJournalSummaryGeneration') == null) setMeta(db, 'publishedJournalSummaryGeneration', '');
  if (getMeta(db, 'journalSummarySourceRevision') == null) setMeta(db, 'journalSummarySourceRevision', '');
  if (getMeta(db, 'journalSummaryState') == null) setMeta(db, 'journalSummaryState', 'unbuilt');
  if (getMeta(db, 'journalSummaryBuildingGeneration') == null) setMeta(db, 'journalSummaryBuildingGeneration', '');
  if (getMeta(db, 'schemaContract') == null) setMeta(db, 'schemaContract', 'journal-v8-w1-w4-w6-1');

  assert.strictEqual(JSON.stringify(db.stores.entries.rows), beforeEntries, 'versionchange rewrote entries');
  assert.strictEqual(JSON.stringify(db.stores.pendingRemoteSaves.rows), beforeRemote, 'versionchange rewrote remote saves');
  assert.strictEqual(JSON.stringify(db.stores.urlStats.rows), beforeUrlStats, 'versionchange rewrote urlStats');
  return db;
}

function verifyV8(db) {
  if (db.version !== 8) return false;
  const legacy = ['entries', 'urlStats', 'meta', 'pendingAppends', 'pendingDownloads', 'pendingRemoteSaves', 'importStaging'];
  if (!legacy.every((name) => db.stores[name])) return false;
  for (const [name, spec] of Object.entries(requiredV8)) {
    const store = db.stores[name];
    if (!store) return false;
    if (JSON.stringify(store.keyPath) !== JSON.stringify(spec.keyPath)) return false;
    if (!spec.indexes.every((idx) => store.indexes.includes(idx))) return false;
  }
  if (!pendingRemoteSaveForwardIndexes.every((idx) => db.stores.pendingRemoteSaves.indexes.includes(idx))) return false;
  if (!String(getMeta(db, 'datasetGeneration') || '')) return false;
  if (!['passive-v8', 'cas-v1'].includes(getMeta(db, 'authorityMode'))) return false;
  const uim = getMeta(db, 'urlIdentityMigration');
  if (!uim || uim.version !== 1 || !['pending', 'running', 'complete'].includes(uim.phase)) return false;
  if (!String(getMeta(db, 'schemaContract') || '').startsWith('journal-v8-')) return false;
  return true;
}

function pageOpen(db, { requestedVersion = 8, allowUpgrade = false } = {}) {
  if (db.version > requestedVersion) return { ok: false, error: 'VERSION_TOO_NEW' };
  if (db.version < requestedVersion) {
    if (!allowUpgrade) return { ok: false, error: 'JOURNAL_SCHEMA_NOT_READY' };
    return { ok: false, error: 'PAGE_MUST_NOT_MIGRATE' };
  }
  if (!verifyV8(db)) return { ok: false, error: 'JOURNAL_SCHEMA_INCOMPLETE' };
  return { ok: true, version: 8, authorityMode: getMeta(db, 'authorityMode') };
}

function publishUrlStatsGeneration(db, { generation, sourceRevision, currentRevision }) {
  setMeta(db, 'urlStatsBuildingGeneration', generation);
  db.stores.urlStatsV2.rows.push({ projectionGeneration: generation, urlKey: 'https://example.test/a', count: 1 });
  if (sourceRevision !== currentRevision) return false;
  setMeta(db, 'publishedUrlStatsGeneration', generation);
  setMeta(db, 'urlStatsSourceRevision', sourceRevision);
  setMeta(db, 'urlStatsState', 'v2-published');
  setMeta(db, 'urlStatsBuildingGeneration', '');
  return true;
}

function publishSummaryGeneration(db, { generation, sourceRevision, currentRevision, sourceJG = 'JG-seed1' }) {
  setMeta(db, 'journalSummaryBuildingGeneration', generation);
  db.stores.journalSummaries.rows.push({
    projectionGeneration: generation,
    entryId: 'E1',
    sourceJournalDatasetGenerationId: sourceJG,
    sourceEntryRevision: 'legacy-v7',
    createdAt: 1,
    urlKey: 'https://example.test/a',
    siteKey: 'example.test',
    readingMode: 'later',
    normalizedTitleSearch: 'a'
  });
  if (sourceRevision !== currentRevision) return false;
  setMeta(db, 'publishedJournalSummaryGeneration', generation);
  setMeta(db, 'journalSummarySourceRevision', sourceRevision);
  setMeta(db, 'journalSummaryState', 'published');
  setMeta(db, 'journalSummaryBuildingGeneration', '');
  return true;
}

function structuralNeedsSatisfied(db) {
  const needs = {
    W1: ['journalFinalizations', 'pendingRemoteMutations'],
    W4: ['urlStatsV2'],
    W6: ['journalSummaries']
  };
  return Object.fromEntries(Object.entries(needs).map(([wave, stores]) => [wave, stores.every((s) => Boolean(db.stores[s]))]));
}

// Legacy preservation.
test('v7 baseline has seven stores', () => assert.strictEqual(Object.keys(v7().stores).length, 7));
test('v7 entries have expected indexes', () => assert(v7().stores.entries.indexes.includes('urlKeyCreatedAt')));
test('v7 remote save only has updatedAt index', () => assert.deepStrictEqual(v7().stores.pendingRemoteSaves.indexes, ['updatedAt']));

test('migration advances exact DB version to 8', () => assert.strictEqual(migrateV7ToV8(v7()).version, 8));
test('migration makes worker sole structural owner', () => assert.strictEqual(migrateV7ToV8(v7()).migrationOwner, 'service-worker-only'));
test('legacy entries store preserved', () => assert(migrateV7ToV8(v7()).stores.entries));
test('legacy urlStats store preserved', () => assert(migrateV7ToV8(v7()).stores.urlStats));
test('legacy meta store preserved', () => assert(migrateV7ToV8(v7()).stores.meta));
test('legacy pendingAppends preserved', () => assert(migrateV7ToV8(v7()).stores.pendingAppends));
test('legacy pendingDownloads preserved', () => assert(migrateV7ToV8(v7()).stores.pendingDownloads));
test('legacy pendingRemoteSaves preserved', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteSaves));
test('legacy importStaging preserved', () => assert(migrateV7ToV8(v7()).stores.importStaging));

test('entry rows are not rewritten in versionchange', () => {
  const before = v7(); const after = migrateV7ToV8(before); assert.deepStrictEqual(after.stores.entries.rows, before.stores.entries.rows);
});
test('legacy remote save row is byte-equivalent after migration', () => {
  const before = v7(); const after = migrateV7ToV8(before); assert.strictEqual(JSON.stringify(after.stores.pendingRemoteSaves.rows), JSON.stringify(before.stores.pendingRemoteSaves.rows));
});
test('legacy urlStats rows are not rebuilt in versionchange', () => {
  const before = v7(); const after = migrateV7ToV8(before); assert.deepStrictEqual(after.stores.urlStats.rows, before.stores.urlStats.rows);
});

// W1 stores/indexes.
test('v8 adds journalFinalizations', () => assert(migrateV7ToV8(v7()).stores.journalFinalizations));
test('journalFinalizations key is finalizationId', () => assert.strictEqual(migrateV7ToV8(v7()).stores.journalFinalizations.keyPath, 'finalizationId'));
test('journalFinalizations has scope-state indexes', () => {
  const i = migrateV7ToV8(v7()).stores.journalFinalizations.indexes; assert(i.includes('urlKeyState') && i.includes('siteKeyState'));
});
test('v8 adds pendingRemoteMutations', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteMutations));
test('pendingRemoteMutations key is remoteEffectId', () => assert.strictEqual(migrateV7ToV8(v7()).stores.pendingRemoteMutations.keyPath, 'remoteEffectId'));
test('pendingRemoteMutations has phaseUpdatedAt', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteMutations.indexes.includes('phaseUpdatedAt')));

// C1 save store forward indexes.
test('pendingRemoteSaves gains phase index', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteSaves.indexes.includes('phase')));
test('pendingRemoteSaves gains physicalOperationId index', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteSaves.indexes.includes('physicalOperationId')));
test('pendingRemoteSaves gains finalizationId index', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteSaves.indexes.includes('finalizationId')));
test('pendingRemoteSaves gains phaseUpdatedAt index', () => assert(migrateV7ToV8(v7()).stores.pendingRemoteSaves.indexes.includes('phaseUpdatedAt')));
test('adding save indexes does not fabricate physical operation field', () => assert.strictEqual(migrateV7ToV8(v7()).stores.pendingRemoteSaves.rows[0].physicalOperationId, undefined));

// W4/W6 stores.
test('v8 adds urlStatsV2', () => assert(migrateV7ToV8(v7()).stores.urlStatsV2));
test('urlStatsV2 primary key is generation plus urlKey', () => assert.deepStrictEqual(migrateV7ToV8(v7()).stores.urlStatsV2.keyPath, ['projectionGeneration', 'urlKey']));
test('urlStatsV2 starts empty', () => assert.strictEqual(migrateV7ToV8(v7()).stores.urlStatsV2.rows.length, 0));
test('v8 adds journalSummaries', () => assert(migrateV7ToV8(v7()).stores.journalSummaries));
test('journalSummaries primary key is generation plus entry', () => assert.deepStrictEqual(migrateV7ToV8(v7()).stores.journalSummaries.keyPath, ['projectionGeneration', 'entryId']));
test('journalSummaries starts empty', () => assert.strictEqual(migrateV7ToV8(v7()).stores.journalSummaries.rows.length, 0));
test('journalSummaries has url ordering index', () => assert(migrateV7ToV8(v7()).stores.journalSummaries.indexes.includes('generationUrlCreatedAt')));
test('journalSummaries has site ordering index', () => assert(migrateV7ToV8(v7()).stores.journalSummaries.indexes.includes('generationSiteCreatedAt')));
test('journalSummaries has reading-mode ordering index', () => assert(migrateV7ToV8(v7()).stores.journalSummaries.indexes.includes('generationReadingCreatedAt')));

// Meta seeding.
test('dataset generation is seeded', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'datasetGeneration'), 'JG-seed1'));
test('authority mode starts passive-v8', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'authorityMode'), 'passive-v8'));
test('url identity migration starts pending', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'urlIdentityMigration').phase, 'pending'));
test('url identity migration does not backfill during upgrade', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'urlIdentityMigration').migratedCount, 0));
test('URL stats state is honest legacy-current', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'urlStatsState'), 'legacy-v1-current'));
test('summary state starts unbuilt', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'journalSummaryState'), 'unbuilt'));
test('schema contract marker is seeded', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'schemaContract'), 'journal-v8-w1-w4-w6-1'));
test('existing journal revision remains unchanged', () => assert.strictEqual(getMeta(migrateV7ToV8(v7()), 'revision'), 'JR1'));

// Generation stability/reopen semantics.
test('migration does not overwrite preexisting dataset generation', () => {
  const db = v7(); setMeta(db, 'datasetGeneration', 'JG-existing'); assert.strictEqual(getMeta(migrateV7ToV8(db), 'datasetGeneration'), 'JG-existing');
});
test('migration does not overwrite preexisting recognized authority mode', () => {
  const db = v7(); setMeta(db, 'authorityMode', 'passive-v8'); assert.strictEqual(getMeta(migrateV7ToV8(db), 'authorityMode'), 'passive-v8');
});

// Projection publish fences.
test('urlStatsV2 publishes when source revision remains exact', () => {
  const db = migrateV7ToV8(v7()); assert.strictEqual(publishUrlStatsGeneration(db, { generation: 'USG2', sourceRevision: 'JR1', currentRevision: 'JR1' }), true); assert.strictEqual(getMeta(db, 'publishedUrlStatsGeneration'), 'USG2');
});
test('urlStatsV2 does not publish stale source generation', () => {
  const db = migrateV7ToV8(v7()); assert.strictEqual(publishUrlStatsGeneration(db, { generation: 'USG2', sourceRevision: 'JR1', currentRevision: 'JR2' }), false); assert.strictEqual(getMeta(db, 'publishedUrlStatsGeneration'), '');
});
test('old urlStats remains after failed v2 build', () => {
  const db = migrateV7ToV8(v7()); publishUrlStatsGeneration(db, { generation: 'USG2', sourceRevision: 'JR1', currentRevision: 'JR2' }); assert.strictEqual(db.stores.urlStats.rows.length, 1);
});
test('summary generation publishes when source revision remains exact', () => {
  const db = migrateV7ToV8(v7()); assert.strictEqual(publishSummaryGeneration(db, { generation: 'SG2', sourceRevision: 'JR1', currentRevision: 'JR1' }), true); assert.strictEqual(getMeta(db, 'publishedJournalSummaryGeneration'), 'SG2');
});
test('summary generation does not publish stale source revision', () => {
  const db = migrateV7ToV8(v7()); assert.strictEqual(publishSummaryGeneration(db, { generation: 'SG2', sourceRevision: 'JR1', currentRevision: 'JR2' }), false); assert.strictEqual(getMeta(db, 'publishedJournalSummaryGeneration'), '');
});
test('summary row retains source JG/ER receipt fields', () => {
  const db = migrateV7ToV8(v7()); publishSummaryGeneration(db, { generation: 'SG2', sourceRevision: 'JR1', currentRevision: 'JR1' }); const row = db.stores.journalSummaries.rows[0]; assert(row.sourceJournalDatasetGenerationId); assert(row.sourceEntryRevision);
});

// Runtime integrity / fail closed.
test('complete v8 passes runtime verification', () => assert.strictEqual(verifyV8(migrateV7ToV8(v7())), true));
test('missing journalFinalizations fails verification', () => { const db = migrateV7ToV8(v7()); delete db.stores.journalFinalizations; assert.strictEqual(verifyV8(db), false); });
test('missing pendingRemoteMutations index fails verification', () => { const db = migrateV7ToV8(v7()); db.stores.pendingRemoteMutations.indexes = db.stores.pendingRemoteMutations.indexes.filter((x) => x !== 'phaseUpdatedAt'); assert.strictEqual(verifyV8(db), false); });
test('missing pendingRemoteSaves forward index fails verification', () => { const db = migrateV7ToV8(v7()); db.stores.pendingRemoteSaves.indexes = db.stores.pendingRemoteSaves.indexes.filter((x) => x !== 'finalizationId'); assert.strictEqual(verifyV8(db), false); });
test('missing summary index fails verification', () => { const db = migrateV7ToV8(v7()); db.stores.journalSummaries.indexes.pop(); assert.strictEqual(verifyV8(db), false); });
test('unknown authority mode fails verification', () => { const db = migrateV7ToV8(v7()); setMeta(db, 'authorityMode', 'future-v99'); assert.strictEqual(verifyV8(db), false); });
test('missing dataset generation fails verification', () => { const db = migrateV7ToV8(v7()); db.stores.meta.rows = db.stores.meta.rows.filter((r) => r.key !== 'datasetGeneration'); assert.strictEqual(verifyV8(db), false); });

// Page non-owner behavior.
test('page opens exact verified v8 read path', () => assert.strictEqual(pageOpen(migrateV7ToV8(v7())).ok, true));
test('page refuses to structurally upgrade v7', () => assert.strictEqual(pageOpen(v7()).error, 'JOURNAL_SCHEMA_NOT_READY'));
test('even upgrade-enabled page path is forbidden', () => assert.strictEqual(pageOpen(v7(), { allowUpgrade: true }).error, 'PAGE_MUST_NOT_MIGRATE'));
test('older page refuses future DB version', () => { const db = migrateV7ToV8(v7()); db.version = 9; assert.strictEqual(pageOpen(db).error, 'VERSION_TOO_NEW'); });
test('page refuses incomplete v8', () => { const db = migrateV7ToV8(v7()); delete db.stores.journalSummaries; assert.strictEqual(pageOpen(db).error, 'JOURNAL_SCHEMA_INCOMPLETE'); });

// Cross-wave structural completeness.
test('W1 structural needs fit v8', () => assert.strictEqual(structuralNeedsSatisfied(migrateV7ToV8(v7())).W1, true));
test('W4 structural needs fit v8', () => assert.strictEqual(structuralNeedsSatisfied(migrateV7ToV8(v7())).W4, true));
test('W6 structural needs fit v8', () => assert.strictEqual(structuralNeedsSatisfied(migrateV7ToV8(v7())).W6, true));
test('all known cross-wave structural needs fit one v8 package', () => assert(Object.values(structuralNeedsSatisfied(migrateV7ToV8(v7()))).every(Boolean)));

console.log(`J0 v8 cross-wave schema package model: PASS; cases=${cases}`);
