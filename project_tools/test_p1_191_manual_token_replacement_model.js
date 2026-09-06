'use strict';
const assert = require('assert');

function currentManualReplace(state, candidate, validate) {
  state.auth = candidate;
  const result = validate(candidate);
  if (result !== 'valid') {
    state.auth = null;
    return result;
  }
  return 'committed';
}

function targetManualReplace(state, candidate, validate, expectedGeneration) {
  const result = validate(candidate);
  if (result !== 'valid') return { outcome: result, committed: false };
  if (state.generation !== expectedGeneration) return { outcome: 'stale-generation', committed: false };
  state.auth = candidate;
  state.generation += 1;
  return { outcome: 'committed', committed: true };
}

function targetPkceFinish(state, candidate, expectedGeneration) {
  if (state.generation !== expectedGeneration) return { outcome: 'stale-generation', committed: false };
  state.auth = candidate;
  state.generation += 1;
  return { outcome: 'committed', committed: true };
}

{
  const state = { auth: 'TOKEN_A_PROVEN', generation: 7 };
  const outcome = currentManualReplace(state, 'TOKEN_B_BAD', () => 'invalid');
  assert.equal(outcome, 'invalid');
  assert.equal(state.auth, null);
}

{
  const state = { auth: 'TOKEN_A_PROVEN', generation: 7 };
  const result = targetManualReplace(state, 'TOKEN_B_BAD', () => 'invalid', 7);
  assert.deepEqual(result, { outcome: 'invalid', committed: false });
  assert.equal(state.auth, 'TOKEN_A_PROVEN');
  assert.equal(state.generation, 7);
}

{
  const state = { auth: 'TOKEN_A_PROVEN', generation: 9 };
  const result = targetManualReplace(state, 'TOKEN_B_UNKNOWN', () => 'unknown', 9);
  assert.equal(result.outcome, 'unknown');
  assert.equal(state.auth, 'TOKEN_A_PROVEN');
  assert.equal(state.generation, 9);
}

{
  const state = { auth: 'TOKEN_A_PROVEN', generation: 11 };
  const result = targetManualReplace(state, 'TOKEN_B_VALID', () => 'valid', 11);
  assert.equal(result.outcome, 'committed');
  assert.equal(state.auth, 'TOKEN_B_VALID');
  assert.equal(state.generation, 12);
}

{
  const state = { auth: 'TOKEN_A_PROVEN', generation: 11 };
  targetManualReplace(state, 'TOKEN_B_VALID', () => 'valid', 11);
  const stalePkce = targetPkceFinish(state, 'TOKEN_OLD_PKCE', 11);
  assert.equal(stalePkce.outcome, 'stale-generation');
  assert.equal(state.auth, 'TOKEN_B_VALID');
  assert.equal(state.generation, 12);
}

{
  const state = { auth: 'TOKEN_A_PROVEN', generation: 4 };
  let validatedToken = '';
  const result = targetManualReplace(state, 'TOKEN_B_VALID', (candidate) => {
    validatedToken = candidate;
    return candidate === 'TOKEN_B_VALID' ? 'valid' : 'invalid';
  }, 4);
  assert.equal(validatedToken, 'TOKEN_B_VALID');
  assert.equal(result.outcome, 'committed');
}

console.log('P1-191 manual token replacement model: PASS');
