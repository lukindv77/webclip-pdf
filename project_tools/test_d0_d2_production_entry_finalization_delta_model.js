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

function freshState(overrides = {}) {
  return {
    physicalOperationId: 'P1',
    pTerminal: false,
    pTerminalSummary: false,
    finalization: null,
    currentJournalDatasetGenerationId: 'JG1',
    currentEntryRevision: 'ER1',
    providerCalls: 0,
    upload: null,
    destructive: null,
    publication: null,
    journalRows: [],
    authorityMode: 'passive-v8',
    hasLegacyByIdWriter: true,
    saveStore: 'pendingRemoteSaves',
    destructiveStore: 'pendingRemoteMutations',
    ...overrides
  };
}

function admitFinalization(s, {
  id = 'F1',
  kind = 'append',
  journalDatasetGenerationId = s.currentJournalDatasetGenerationId,
  expectedEntryRevision = null,
  scope = 'url:a'
} = {}) {
  assert(s.physicalOperationId, 'physical operation must exist before F');
  assert(!s.finalization, 'F is create-once in this model');
  s.finalization = {
    id,
    physicalOperationId: s.physicalOperationId,
    kind,
    journalDatasetGenerationId,
    expectedEntryRevision,
    scope,
    state: 'admitted'
  };
  return s.finalization;
}

function revokeFinalization(s) {
  assert(s.finalization, 'F required');
  if (s.finalization.state === 'admitted') s.finalization.state = 'revoked';
}

function clearScoped(s, scope = 'url:a') {
  if (s.finalization?.state === 'admitted' && s.finalization.scope === scope) {
    s.finalization.state = 'revoked';
  }
  if (s.upload?.phase === 'prepared' && s.finalization?.state !== 'admitted') {
    s.upload.phase = 'canceled-before-start';
  }
  if (s.destructive?.phase === 'prepared' && s.finalization?.state !== 'admitted') {
    s.destructive.phase = 'canceled-before-start';
  }
}

function replaceDataset(s, next = 'JG2') {
  s.currentJournalDatasetGenerationId = next;
  if (s.finalization?.state === 'admitted') s.finalization.state = 'revoked';
  if (s.upload?.phase === 'prepared') s.upload.phase = 'canceled-before-start';
  if (s.destructive?.phase === 'prepared') s.destructive.phase = 'canceled-before-start';
}

function mutateEntry(s, next = 'ER2') {
  s.currentEntryRevision = next;
}

function prepareUpload(s, {
  id = 'EU1',
  pdfGeneration = 'G1',
  byteLength = 100,
  sha256 = 'sha256:' + 'a'.repeat(64),
  sealed = true
} = {}) {
  assert(s.finalization, 'F must exist before upload admission');
  assert.strictEqual(s.saveStore, 'pendingRemoteSaves');
  s.upload = {
    id,
    physicalOperationId: s.physicalOperationId,
    finalizationId: s.finalization.id,
    store: s.saveStore,
    pdfGeneration,
    byteLength,
    sha256,
    sealed,
    phase: 'prepared',
    remoteVerified: false
  };
  return s.upload;
}

function prepareDestructive(s, { id = 'ED1', targetPath = '/Trash/x.pdf' } = {}) {
  assert(s.finalization, 'F must exist before destructive admission');
  assert.strictEqual(s.destructiveStore, 'pendingRemoteMutations');
  s.destructive = {
    id,
    physicalOperationId: s.physicalOperationId,
    finalizationId: s.finalization.id,
    store: s.destructiveStore,
    targetPath,
    sourceResourceId: 'RID1',
    phase: 'prepared',
    remoteVerified: false
  };
  return s.destructive;
}

function checkEffectStartAuthority(s, effect, existingRow) {
  assert(effect, 'effect receipt required');
  assert(s.finalization, 'F required');
  assert.strictEqual(effect.physicalOperationId, s.physicalOperationId, 'P mismatch');
  assert.strictEqual(effect.finalizationId, s.finalization.id, 'F identity mismatch');
  assert.strictEqual(s.finalization.state, 'admitted', 'F revoked/stale');
  assert.strictEqual(
    s.currentJournalDatasetGenerationId,
    s.finalization.journalDatasetGenerationId,
    'JG stale'
  );
  if (existingRow) {
    assert.strictEqual(
      s.currentEntryRevision,
      s.finalization.expectedEntryRevision,
      'ER stale'
    );
  }
  assert.strictEqual(effect.phase, 'prepared', 'effect not prepared');
}

function startUpload(s) {
  checkEffectStartAuthority(s, s.upload, false);
  assert.strictEqual(s.upload.sealed, true, 'PDF must be sealed');
  s.upload.phase = 'started-unknown';
  s.providerCalls += 1;
}

function startDestructive(s) {
  checkEffectStartAuthority(s, s.destructive, true);
  s.destructive.phase = 'started-unknown';
  s.providerCalls += 1;
}

function verifyUpload(s) {
  assert(['started-unknown', 'verified'].includes(s.upload?.phase), 'upload not started');
  s.upload.phase = 'verified';
  s.upload.remoteVerified = true;
}

function verifyDestructive(s, { resourceId = 'RID1', targetPath = '/Trash/x.pdf' } = {}) {
  assert(['started-unknown', 'verified'].includes(s.destructive?.phase), 'destructive not started');
  assert.strictEqual(resourceId, s.destructive.sourceResourceId, 'wrong remote object');
  assert.strictEqual(targetPath, s.destructive.targetPath, 'wrong target path');
  s.destructive.phase = 'verified';
  s.destructive.remoteVerified = true;
}

function preparePublication(s, { generation = 'PG1', currentGeneration = 'PG1', enabled = true, currentEnabled = true } = {}) {
  assert(s.upload?.remoteVerified, 'upload must be exact before publication');
  s.publication = {
    id: 'EP1',
    admittedGeneration: generation,
    currentGeneration,
    admittedEnabled: enabled,
    currentEnabled,
    phase: 'not-started'
  };
}

function startPublication(s) {
  const p = s.publication;
  assert(p, 'publication receipt required');
  if (!p.admittedEnabled || !p.currentEnabled || p.admittedGeneration !== p.currentGeneration || s.finalization?.state !== 'admitted') {
    p.phase = 'suppressed-before-start';
    return false;
  }
  p.phase = 'started-unknown';
  s.providerCalls += 1;
  return true;
}

function verifyPublication(s, published = true) {
  assert(s.publication?.phase === 'started-unknown', 'publication not started');
  s.publication.phase = published ? 'verified-published' : 'verified-not-published';
}

function finalizationAuthorityCurrent(s, existingRow) {
  if (!s.finalization || s.finalization.state !== 'admitted') return false;
  if (s.currentJournalDatasetGenerationId !== s.finalization.journalDatasetGenerationId) return false;
  if (existingRow && s.currentEntryRevision !== s.finalization.expectedEntryRevision) return false;
  return true;
}

function finalizeSave(s) {
  assert(s.upload?.remoteVerified, 'exact remote upload required');
  const publicationTerminal = !s.publication || [
    'suppressed-before-start',
    'verified-published',
    'verified-not-published'
  ].includes(s.publication.phase);
  assert(publicationTerminal, 'publication settlement incomplete');
  if (!finalizationAuthorityCurrent(s, false)) {
    s.pTerminal = true;
    s.pTerminalSummary = true;
    return 'remote-complete-journal-suppressed';
  }
  s.journalRows.push({
    physicalOperationId: s.physicalOperationId,
    pdfGeneration: s.upload.pdfGeneration,
    byteLength: s.upload.byteLength,
    sha256: s.upload.sha256,
    entryRevision: 'ER-new'
  });
  s.finalization.state = 'finalized';
  s.pTerminal = true;
  s.pTerminalSummary = true;
  return 'journal-finalized';
}

function finalizeDestructive(s) {
  assert(s.destructive?.remoteVerified, 'exact remote destructive effect required');
  if (!finalizationAuthorityCurrent(s, true)) {
    s.destructive.phase = 'remote-complete-local-suppressed';
    s.pTerminal = true;
    s.pTerminalSummary = true;
    return 'remote-complete-local-suppressed';
  }
  s.destructive.phase = 'local-finalized';
  s.finalization.state = 'finalized';
  s.currentEntryRevision = 'ER-next';
  s.pTerminal = true;
  s.pTerminalSummary = true;
  return 'local-finalized';
}

function canActivateCasV1(s, gates = {}) {
  const all = {
    protocolCurrent: true,
    workerSoleMigrationOwner: true,
    pageNonOwner: true,
    finalizationHelpers: true,
    casHelpers: true,
    legacyBridge: true,
    clearSemantics: true,
    saveStartGate: true,
    destructiveStartGate: true,
    recoveryBothStores: true,
    ...gates
  };
  return Object.values(all).every(Boolean) && !s.hasLegacyByIdWriter;
}

function gcAllowed(effect, pSummary, ageOnly = false) {
  const unresolved = new Set(['prepared', 'started-unknown', 'verified', 'manual-resolution']);
  if (!effect) return false;
  if (unresolved.has(effect.phase)) return false;
  if (ageOnly) return false;
  return Boolean(pSummary);
}

function recoveryPriority(phase) {
  return ({ verified: 1, 'started-unknown': 2, prepared: 3, 'manual-resolution': 4 })[phase] || 99;
}

// F ordering / P continuity.
test('P required before F', () => {
  const s = freshState({ physicalOperationId: '' });
  assert.throws(() => admitFinalization(s));
});

test('F admitted after P', () => {
  const s = freshState(); admitFinalization(s); assert.strictEqual(s.finalization.physicalOperationId, 'P1');
});

test('P exists/F missing is recoverable under same P', () => {
  const s = freshState(); const p = s.physicalOperationId; admitFinalization(s); assert.strictEqual(s.finalization.physicalOperationId, p);
});

test('P exists/F capacity failure terminalizes same P, not replacement P', () => {
  const s = freshState(); const p = s.physicalOperationId; s.pTerminal = true; assert.strictEqual(s.physicalOperationId, p);
});

// Store separation.
test('save effects use pendingRemoteSaves', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); assert.strictEqual(s.upload.store, 'pendingRemoteSaves');
});

test('destructive effects use pendingRemoteMutations', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); assert.strictEqual(s.destructive.store, 'pendingRemoteMutations');
});

test('save/destructive stores are distinct', () => {
  const s = freshState(); assert.notStrictEqual(s.saveStore, s.destructiveStore);
});

// Upload effect-start gate.
test('upload cannot be prepared without F', () => {
  const s = freshState(); assert.throws(() => prepareUpload(s));
});

test('upload cannot start with revoked F', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); revokeFinalization(s); assert.throws(() => startUpload(s)); assert.strictEqual(s.providerCalls, 0);
});

test('upload cannot start with stale JG', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); s.currentJournalDatasetGenerationId = 'JG2'; assert.throws(() => startUpload(s)); assert.strictEqual(s.providerCalls, 0);
});

test('upload cannot start from unsealed PDF', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s, { sealed: false }); assert.throws(() => startUpload(s)); assert.strictEqual(s.providerCalls, 0);
});

test('upload start persists started-unknown before provider effect model', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); assert.strictEqual(s.upload.phase, 'started-unknown'); assert.strictEqual(s.providerCalls, 1);
});

test('scoped clear before upload start cancels prepared effect', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); clearScoped(s); assert.strictEqual(s.upload.phase, 'canceled-before-start'); assert.strictEqual(s.providerCalls, 0);
});

test('dataset replace before upload start cancels prepared effect', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); replaceDataset(s); assert.strictEqual(s.upload.phase, 'canceled-before-start'); assert.strictEqual(s.providerCalls, 0);
});

test('clear after upload start does not cancel started effect', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); clearScoped(s); assert.strictEqual(s.upload.phase, 'started-unknown');
});

test('replace after upload start does not cancel started effect', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); replaceDataset(s); assert.strictEqual(s.upload.phase, 'started-unknown');
});

// Save finalization.
test('verified upload with current F/JG finalizes Journal', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); assert.strictEqual(finalizeSave(s), 'journal-finalized'); assert.strictEqual(s.journalRows.length, 1);
});

test('verified upload after scoped clear suppresses Journal', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); clearScoped(s); verifyUpload(s); assert.strictEqual(finalizeSave(s), 'remote-complete-journal-suppressed'); assert.strictEqual(s.journalRows.length, 0);
});

test('verified upload after dataset replace suppresses Journal', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); replaceDataset(s); verifyUpload(s); assert.strictEqual(finalizeSave(s), 'remote-complete-journal-suppressed');
});

test('save Journal row carries sealed G/N/H evidence', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); finalizeSave(s); assert.strictEqual(s.journalRows[0].pdfGeneration, 'G1'); assert.strictEqual(s.journalRows[0].byteLength, 100); assert(/^sha256:[a-f0-9]{64}$/.test(s.journalRows[0].sha256));
});

test('remote verified required before Journal append', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); assert.throws(() => finalizeSave(s));
});

// Publication generation/effect.
test('publication requires exact upload first', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); assert.throws(() => preparePublication(s));
});

test('publication generation mismatch suppresses before start', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s, { generation: 'PG1', currentGeneration: 'PG2' }); assert.strictEqual(startPublication(s), false); assert.strictEqual(s.publication.phase, 'suppressed-before-start');
});

test('publication disabled before start suppresses', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s, { currentEnabled: false }); assert.strictEqual(startPublication(s), false);
});

test('revoked F suppresses not-yet-started publication', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s); revokeFinalization(s); assert.strictEqual(startPublication(s), false);
});

test('publication start becomes started-unknown', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s); assert.strictEqual(startPublication(s), true); assert.strictEqual(s.publication.phase, 'started-unknown');
});

test('policy change after publication start does not cancel', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s); startPublication(s); s.publication.currentEnabled = false; assert.strictEqual(s.publication.phase, 'started-unknown'); verifyPublication(s, true); assert.strictEqual(s.publication.phase, 'verified-published');
});

test('save finalization waits for started publication settlement', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s); startPublication(s); assert.throws(() => finalizeSave(s));
});

test('published settlement permits save finalization', () => {
  const s = freshState(); admitFinalization(s); prepareUpload(s); startUpload(s); verifyUpload(s); preparePublication(s); startPublication(s); verifyPublication(s, true); assert.strictEqual(finalizeSave(s), 'journal-finalized');
});

// Destructive effect gate / ER.
test('destructive cannot start with stale ER', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); mutateEntry(s, 'ER2'); assert.throws(() => startDestructive(s)); assert.strictEqual(s.providerCalls, 0);
});

test('destructive cannot start with stale JG', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); s.currentJournalDatasetGenerationId = 'JG2'; assert.throws(() => startDestructive(s)); assert.strictEqual(s.providerCalls, 0);
});

test('destructive clear before start cancels', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); clearScoped(s); assert.strictEqual(s.destructive.phase, 'canceled-before-start'); assert.strictEqual(s.providerCalls, 0);
});

test('destructive start wins before clear and remains unknown', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); clearScoped(s); assert.strictEqual(s.destructive.phase, 'started-unknown');
});

test('destructive verification rejects different object identity', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); assert.throws(() => verifyDestructive(s, { resourceId: 'RID2' }));
});

test('destructive verification rejects different target path', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); assert.throws(() => verifyDestructive(s, { targetPath: '/Trash/other.pdf' }));
});

test('destructive verified + current authority local-finalizes', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); verifyDestructive(s); assert.strictEqual(finalizeDestructive(s), 'local-finalized'); assert.strictEqual(s.currentEntryRevision, 'ER-next');
});

test('destructive verified + F revoked suppresses local mutation', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); verifyDestructive(s); revokeFinalization(s); assert.strictEqual(finalizeDestructive(s), 'remote-complete-local-suppressed');
});

test('destructive verified + ER changed suppresses local mutation', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); verifyDestructive(s); mutateEntry(s, 'ER2'); assert.strictEqual(finalizeDestructive(s), 'remote-complete-local-suppressed');
});

test('destructive verified + JG changed suppresses local mutation', () => {
  const s = freshState(); admitFinalization(s, { kind: 'trash-delete', expectedEntryRevision: 'ER1' }); prepareDestructive(s); startDestructive(s); verifyDestructive(s); s.currentJournalDatasetGenerationId = 'JG2'; assert.strictEqual(finalizeDestructive(s), 'remote-complete-local-suppressed');
});

// CAS activation gate.
test('cas-v1 blocked while legacy by-id writer remains', () => {
  const s = freshState({ hasLegacyByIdWriter: true }); assert.strictEqual(canActivateCasV1(s), false);
});

test('cas-v1 can activate only after all writers/gates ready', () => {
  const s = freshState({ hasLegacyByIdWriter: false }); assert.strictEqual(canActivateCasV1(s), true);
});

test('cas-v1 blocked without protocol fence', () => {
  const s = freshState({ hasLegacyByIdWriter: false }); assert.strictEqual(canActivateCasV1(s, { protocolCurrent: false }), false);
});

test('cas-v1 blocked without clear semantics', () => {
  const s = freshState({ hasLegacyByIdWriter: false }); assert.strictEqual(canActivateCasV1(s, { clearSemantics: false }), false);
});

test('cas-v1 blocked if save start gate absent', () => {
  const s = freshState({ hasLegacyByIdWriter: false }); assert.strictEqual(canActivateCasV1(s, { saveStartGate: false }), false);
});

test('cas-v1 blocked if destructive start gate absent', () => {
  const s = freshState({ hasLegacyByIdWriter: false }); assert.strictEqual(canActivateCasV1(s, { destructiveStartGate: false }), false);
});

test('cas-v1 blocked unless recovery knows both remote stores', () => {
  const s = freshState({ hasLegacyByIdWriter: false }); assert.strictEqual(canActivateCasV1(s, { recoveryBothStores: false }), false);
});

// Retention / fairness.
test('prepared unresolved effect cannot GC by age', () => {
  assert.strictEqual(gcAllowed({ phase: 'prepared' }, true, true), false);
});

test('started-unknown cannot GC by age', () => {
  assert.strictEqual(gcAllowed({ phase: 'started-unknown' }, true, true), false);
});

test('verified pending local finalization cannot GC', () => {
  assert.strictEqual(gcAllowed({ phase: 'verified' }, true, false), false);
});

test('manual-resolution detail not ordinary GC', () => {
  assert.strictEqual(gcAllowed({ phase: 'manual-resolution' }, true, false), false);
});

test('terminal detail requires P summary before GC', () => {
  assert.strictEqual(gcAllowed({ phase: 'local-finalized' }, false, false), false);
});

test('terminal detail can GC after P terminal summary', () => {
  assert.strictEqual(gcAllowed({ phase: 'local-finalized' }, true, false), true);
});

test('age alone never proves terminal GC', () => {
  assert.strictEqual(gcAllowed({ phase: 'local-finalized' }, true, true), false);
});

test('verified recovery outranks started-unknown', () => {
  assert(recoveryPriority('verified') < recoveryPriority('started-unknown'));
});

test('started-unknown outranks prepared', () => {
  assert(recoveryPriority('started-unknown') < recoveryPriority('prepared'));
});

test('prepared outranks manual only as status opportunity, not auto-start permission', () => {
  assert(recoveryPriority('prepared') < recoveryPriority('manual-resolution'));
});

console.log(`D0/D2 production-entry finalization delta model: PASS; cases=${cases}`);
