'use strict';

const assert = require('node:assert/strict');

function fenceCount(tokens, resetRounds) {
  const fences = new Set();
  for (let round = 0; round < resetRounds; round += 1) {
    for (const token of tokens) fences.add(token);
  }
  return fences.size;
}

(function repeatedResetsDoNotIncreaseOneFencePerLegacySource() {
  const tokens = Array.from({ length: 20 }, (_, index) => `token-${index}`);
  assert.equal(fenceCount(tokens, 1000), 20);
})();

(function partialScopedFencingRemainsBoundedByDistinctSourceRows() {
  const tokens = Array.from({ length: 7 }, (_, index) => `token-${index}`);
  assert.equal(fenceCount(tokens, 1000), 7);
})();

(function duplicateSourceTokensRemainIdempotent() {
  const tokens = ['a', 'a', 'b', 'b', 'c'];
  assert.equal(fenceCount(tokens, 500), 3);
})();

console.log('P0-072 legacy fence lifetime bound model: PASS');
