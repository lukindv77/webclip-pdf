'use strict';

const assert = require('node:assert/strict');

function classifyLegacyLocal(row) {
  if (row.stageAdmissions?.['download-start']) return row.stageAdmissions['download-start'].state;
  if (row.kind === 'download') return 'admitted';
  if (row.kind === 'unknown') return 'admission-unknown';
  if (row.kind === 'intent') return 'admission-unknown';
  return 'admission-unknown';
}

function classifyLegacyRemote(row) {
  if (row.stageAdmissions) return row.stageAdmissions;
  if (row.phase === 'remote-verified') {
    return {
      upload: { state: 'terminal', outcome: 'remote-verified' },
      publish: row.data?.publicUrl ? { state: 'terminal', outcome: 'published-observed' } : { state: 'admission-unknown' }
    };
  }
  if (row.phase === 'stale-unverified') return { upload: { state: 'admission-unknown' }, publish: { state: 'admission-unknown' } };
  return { upload: { state: 'admission-unknown' }, publish: { state: 'admission-unknown' } };
}

function resetLegacyStage(state) {
  return state === 'prepared' ? 'cancelled-before-start' : state;
}

(function legacyIntentIsNotPreparedByDefault() {
  assert.equal(classifyLegacyLocal({ kind: 'intent' }), 'admission-unknown');
  assert.notEqual(resetLegacyStage(classifyLegacyLocal({ kind: 'intent' })), 'cancelled-before-start');
})();

(function legacyNumericDownloadIsDefinitelyAdmitted() {
  assert.equal(classifyLegacyLocal({ kind: 'download', downloadId: 77 }), 'admitted');
})();

(function legacyUnknownRemainsUnknown() {
  assert.equal(classifyLegacyLocal({ kind: 'unknown' }), 'admission-unknown');
})();

(function legacyRemotePreparedIsNotCancelledBeforeStart() {
  const stages = classifyLegacyRemote({ phase: 'prepared', data: {} });
  assert.equal(stages.upload.state, 'admission-unknown');
  assert.equal(stages.publish.state, 'admission-unknown');
})();

(function verifiedRemoteCanPreserveKnownFactsOnly() {
  const stages = classifyLegacyRemote({ phase: 'remote-verified', data: { publicUrl: 'https://disk.example/public' } });
  assert.equal(stages.upload.outcome, 'remote-verified');
  assert.equal(stages.publish.outcome, 'published-observed');
})();

(function newExplicitPreparedStateSupportsResetCancellation() {
  const row = { kind: 'intent', stageAdmissions: { 'download-start': { state: 'prepared' } } };
  assert.equal(classifyLegacyLocal(row), 'prepared');
  assert.equal(resetLegacyStage(classifyLegacyLocal(row)), 'cancelled-before-start');
})();

console.log('P0-072 stage rollout compatibility model: PASS');
