'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const source = fs.readFileSync('journal-import-digest.js', 'utf8');
const context = vm.createContext({ globalThis: {} });
vm.runInContext(source, context, { filename: 'journal-import-digest.js' });
const api = context.globalThis.WebClipSha256;
assert(api && typeof api.create === 'function', 'WebClipSha256.create() must exist');

function nodeHex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function webclipHex(bytes, splitPattern) {
  const digest = api.create();
  let offset = 0;
  let patternIndex = 0;
  while (offset < bytes.length) {
    const width = Math.max(1, splitPattern[patternIndex % splitPattern.length]);
    const end = Math.min(bytes.length, offset + width);
    digest.update(new Uint8Array(bytes.buffer, bytes.byteOffset + offset, end - offset));
    offset = end;
    patternIndex += 1;
  }
  return digest.digestHex();
}

const fixtures = [
  Buffer.from(''),
  Buffer.from('%PDF-1.4\n%%EOF\n'),
  Buffer.from('%PDF-1.7\n' + 'WebClip exact PDF bytes\n'.repeat(1000) + '%%EOF\n'),
  crypto.randomBytes(1024 * 1024 + 137)
];
const patterns = [
  [1],
  [2, 3, 5, 7, 11],
  [63, 64, 65],
  [4096],
  [1024 * 1024]
];

let cases = 0;
for (const bytes of fixtures) {
  const expected = nodeHex(bytes);
  for (const pattern of patterns) {
    const actual = webclipHex(bytes, pattern);
    assert.equal(actual, expected, `SHA mismatch for bytes=${bytes.length}, pattern=${pattern.join(',')}`);
    cases += 1;
  }
}

// A digest instance is one-shot: after digestHex(), update must fail.
const oneShot = api.create();
oneShot.update(new Uint8Array([1, 2, 3]));
const first = oneShot.digestHex();
assert.equal(first, nodeHex(Buffer.from([1, 2, 3])));
assert.throws(() => oneShot.update(new Uint8Array([4])));
cases += 1;

console.log(`A3/B1 incremental SHA reuse: PASS; cases=${cases}`);
