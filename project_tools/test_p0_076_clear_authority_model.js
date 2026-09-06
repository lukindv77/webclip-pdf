'use strict';

const assert = require('node:assert/strict');

function makeClearAuthority({ revision, scope, scopeKey = '' }) {
  return Object.freeze({ version: 1, expectedJournalRevision: revision, scope, scopeKey });
}

function admitClear({ authority, currentRevision, requestedScope, requestedScopeKey = '' }) {
  if (!authority || authority.version !== 1) return 'invalid-authority';
  if (!['all', 'site', 'url'].includes(authority.scope)) return 'invalid-authority';
  if (authority.scope !== requestedScope || authority.scopeKey !== requestedScopeKey) return 'scope-mismatch';
  if (authority.expectedJournalRevision !== currentRevision) return 'stale-journal-revision';
  return 'permit-transaction';
}

(function staleNotificationIsNotAuthority() {
  const uiNotificationRevision = 'G1';
  const currentIdbRevision = 'G2';
  assert.notEqual(uiNotificationRevision, currentIdbRevision);
  const receipt = makeClearAuthority({ revision: uiNotificationRevision, scope: 'all' });
  assert.equal(admitClear({ authority: receipt, currentRevision: currentIdbRevision, requestedScope: 'all' }), 'stale-journal-revision');
})();

(function scopeIsBound() {
  const receipt = makeClearAuthority({ revision: 'G1', scope: 'site', scopeKey: 'example.test' });
  assert.equal(admitClear({ authority: receipt, currentRevision: 'G1', requestedScope: 'site', requestedScopeKey: 'example.test' }), 'permit-transaction');
  assert.equal(admitClear({ authority: receipt, currentRevision: 'G1', requestedScope: 'all' }), 'scope-mismatch');
  assert.equal(admitClear({ authority: receipt, currentRevision: 'G1', requestedScope: 'site', requestedScopeKey: 'other.test' }), 'scope-mismatch');
})();

(function concurrentClearsSerializeOnMetaRevision() {
  const a = makeClearAuthority({ revision: 'G1', scope: 'all' });
  const b = makeClearAuthority({ revision: 'G1', scope: 'all' });
  assert.equal(admitClear({ authority: a, currentRevision: 'G1', requestedScope: 'all' }), 'permit-transaction');
  const afterFirstCommit = 'G2';
  assert.equal(admitClear({ authority: b, currentRevision: afterFirstCommit, requestedScope: 'all' }), 'stale-journal-revision');
})();

(function pointMutationInvalidatesOldConfirmation() {
  const receipt = makeClearAuthority({ revision: 'G1', scope: 'site', scopeKey: 'example.test' });
  const revisionAfterComment = 'G2';
  assert.equal(admitClear({ authority: receipt, currentRevision: revisionAfterComment, requestedScope: 'site', requestedScopeKey: 'example.test' }), 'stale-journal-revision');
})();

(function mutationGenerationIsDifferentDimension() {
  const journalMutationGeneration = 'MG1';
  const sameGenerationAfterComment = 'MG1';
  assert.equal(journalMutationGeneration, sameGenerationAfterComment,
    'Point mutation intentionally does not rotate bulk mutation generation.');
  const receipt = makeClearAuthority({ revision: 'R1', scope: 'all' });
  assert.equal(admitClear({ authority: receipt, currentRevision: 'R2', requestedScope: 'all' }), 'stale-journal-revision',
    'Clear confirmation must bind DB revision, not only Journal mutation generation.');
})();

console.log('P0-076 clear authority model: PASS');
