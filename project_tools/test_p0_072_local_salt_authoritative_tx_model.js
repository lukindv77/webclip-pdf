'use strict';

const assert = require('node:assert/strict');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function runReset(state, { scope = 'all', hiddenLegacyCount = 0 } = {}) {
  const next = clone(state);
  const hasDependentState = Boolean(
    (next.externalEffects || []).length || (next.legacyFences || []).length
  );
  const needsScopeToken = (scope === 'url' || scope === 'site') && (next.externalEffects || []).length > 0;
  const needsLegacyToken = hiddenLegacyCount > 0;

  if (!next.salt) {
    if (hasDependentState && (needsScopeToken || needsLegacyToken)) {
      return { state: clone(state), status: 'abort-missing-salt-dependent' };
    }
    if (needsScopeToken || needsLegacyToken) next.salt = 'a'.repeat(64);
  }

  if (scope === 'all' || scope === 'import') {
    next.externalEffects = (next.externalEffects || []).map((id) => `detached:${id}`);
  } else if (needsScopeToken) {
    next.externalEffects = (next.externalEffects || []).map((id) => `detached:${id}`);
  }

  if (hiddenLegacyCount > 0) {
    next.legacyFences = next.legacyFences || [];
    for (let index = 0; index < hiddenLegacyCount; index += 1) next.legacyFences.push(`fence-${index}`);
  }
  return { state: next, status: 'commit' };
}

(function hiddenLegacyCanBootstrapSaltInsideAuthoritativeTransaction() {
  const initial = { salt: null, externalEffects: [], legacyFences: [] };
  const result = runReset(initial, { scope: 'all', hiddenLegacyCount: 1 });
  assert.equal(result.status, 'commit');
  assert.equal(result.state.salt.length, 64);
  assert.deepEqual(result.state.legacyFences, ['fence-0']);
})();

(function scopedResetFailsClosedWhenDependentStateLostItsSalt() {
  const initial = { salt: null, externalEffects: ['effect-1'], legacyFences: [] };
  const result = runReset(initial, { scope: 'url', hiddenLegacyCount: 0 });
  assert.equal(result.status, 'abort-missing-salt-dependent');
  assert.deepEqual(result.state, initial);
})();

(function fullResetCanDetachVisibleReceiptNamespaceWithoutSalt() {
  const initial = { salt: null, externalEffects: ['effect-1'], legacyFences: [] };
  const result = runReset(initial, { scope: 'all', hiddenLegacyCount: 0 });
  assert.equal(result.status, 'commit');
  assert.deepEqual(result.state.externalEffects, ['detached:effect-1']);
  assert.equal(result.state.salt, null);
})();

(function fullResetWithHiddenLegacyCannotInventReplacementSaltForDependentState() {
  const initial = { salt: null, externalEffects: ['effect-1'], legacyFences: [] };
  const result = runReset(initial, { scope: 'all', hiddenLegacyCount: 1 });
  assert.equal(result.status, 'abort-missing-salt-dependent');
  assert.deepEqual(result.state, initial);
})();

console.log('P0-072 local salt authoritative-transaction bootstrap model: PASS');
