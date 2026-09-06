'use strict';
const assert = require('node:assert/strict');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateP0072GenerationId(cryptoObject) {
  if (!cryptoObject || typeof cryptoObject.randomUUID !== 'function') {
    throw new Error('P0_072_STRONG_UUID_UNAVAILABLE');
  }
  const id = cryptoObject.randomUUID();
  if (!UUID_V4.test(id)) throw new Error('P0_072_STRONG_UUID_INVALID');
  return id;
}

assert.equal(
  generateP0072GenerationId({
    randomUUID: () => '11111111-1111-4111-8111-111111111111'
  }),
  '11111111-1111-4111-8111-111111111111'
);
assert.throws(
  () => generateP0072GenerationId({}),
  /P0_072_STRONG_UUID_UNAVAILABLE/
);
assert.throws(
  () => generateP0072GenerationId({ randomUUID: () => 'weak-123' }),
  /P0_072_STRONG_UUID_INVALID/
);

console.log('P0-072 strong generation id model: PASS');
