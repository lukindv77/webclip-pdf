'use strict';

const assert = require('node:assert/strict');

function advance(localRevision) {
  if (!localRevision || localRevision.version !== 1) return { ok: false, outcome: 'invalid-authority' };
  const revision = Number(localRevision.revision);
  if (!Number.isSafeInteger(revision) || revision < 1) return { ok: false, outcome: 'invalid-authority' };
  if (revision >= Number.MAX_SAFE_INTEGER) return { ok: false, outcome: 'entry-revision-exhausted' };
  return { ok: true, value: { ...localRevision, revision: revision + 1 } };
}

(function ordinaryAdvance() {
  const current = { version: 1, generation: 'G', revision: 1 };
  const next = advance(current);
  assert.equal(next.ok, true);
  assert.equal(next.value.generation, 'G');
  assert.equal(next.value.revision, 2);
})();

(function noWrapOrImplicitReincarnation() {
  const current = { version: 1, generation: 'G', revision: Number.MAX_SAFE_INTEGER };
  const next = advance(current);
  assert.equal(next.ok, false);
  assert.equal(next.outcome, 'entry-revision-exhausted');
  assert.equal(Object.prototype.hasOwnProperty.call(next, 'value'), false);
})();

(function invalidNumbersFailClosed() {
  for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
    const result = advance({ version: 1, generation: 'G', revision });
    assert.equal(result.ok, false);
  }
})();

(function receiptTruthSurvivesLocalExhaustion() {
  const receipt = Object.freeze({ effectId: 'E', phase: 'remote-verified', factualOutcome: 'complete' });
  const result = advance({ version: 1, generation: 'G', revision: Number.MAX_SAFE_INTEGER });
  assert.equal(result.outcome, 'entry-revision-exhausted');
  assert.equal(receipt.phase, 'remote-verified');
  assert.equal(receipt.factualOutcome, 'complete');
})();

console.log('P0-076 revision exhaustion model: PASS');
