'use strict';

const assert = require('node:assert/strict');

function legacyAuthority(entryId, journalGeneration, legacyDbRevision) {
  return Object.freeze({ version: 1, kind: 'legacy', entryId, journalGeneration, legacyDbRevision });
}

function modernAuthority(entryId, journalGeneration, entryGeneration, entryRevision) {
  return Object.freeze({ version: 1, kind: 'modern', entryId, journalGeneration, entryGeneration, entryRevision });
}

function validateTarget(authority, messageId) {
  if (!authority || authority.version !== 1) return 'invalid-authority';
  if (authority.entryId !== messageId) return 'authority-target-mismatch';
  return 'target-bound';
}

(function legacyTokensAreNotTransferableAcrossRows() {
  const a = legacyAuthority('entry-A', 'JG1', 'R1');
  const b = legacyAuthority('entry-B', 'JG1', 'R1');
  assert.equal(a.journalGeneration, b.journalGeneration);
  assert.equal(a.legacyDbRevision, b.legacyDbRevision);
  assert.equal(validateTarget(a, 'entry-A'), 'target-bound');
  assert.equal(validateTarget(a, 'entry-B'), 'authority-target-mismatch');
})();

(function modernTargetBindingDoesNotRelyOnlyOnGenerationUniqueness() {
  const syntheticCollision = 'same-entry-generation';
  const a = modernAuthority('entry-A', 'JG1', syntheticCollision, 7);
  const b = modernAuthority('entry-B', 'JG1', syntheticCollision, 7);
  assert.equal(a.entryGeneration, b.entryGeneration);
  assert.equal(validateTarget(a, 'entry-B'), 'authority-target-mismatch');
})();

(function boundedEnvelopeStillFits() {
  const maxId = 'x'.repeat(180);
  const modern = modernAuthority(maxId, 'g'.repeat(36), 'e'.repeat(36), Number.MAX_SAFE_INTEGER);
  const legacy = legacyAuthority(maxId, 'g'.repeat(36), 'r'.repeat(128));
  assert(JSON.stringify(modern).length <= 512);
  assert(JSON.stringify(legacy).length <= 512);
})();

console.log('P0-076 authority target binding model: PASS');
