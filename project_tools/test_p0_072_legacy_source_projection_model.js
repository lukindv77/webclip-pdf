'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const MAX_DATA_CHARS = 320 * 1024;

function boundedString(value, max) { return String(value || '').slice(0, max); }
function sourceProjection(raw) {
  const data = raw && typeof raw.data === 'object' && raw.data ? raw.data : {};
  const explicitId = String(raw?.id || data.journalEntryId || '').trim();
  const base = {
    explicitId,
    createdAt: Number(raw?.createdAt || data.journalCreatedAt || 0) || 0,
    updatedAt: Number(raw?.updatedAt || 0) || 0,
    attemptCount: Math.max(0, Number(raw?.attemptCount || 0) || 0),
    operationId: boundedString(raw?.operationId || data.operationId, 180),
    lastError: boundedString(raw?.lastError, 2000),
    data: {
      destination: data.destination === 'yandex' ? 'yandex' : 'download',
      filename: boundedString(data.filename, 512),
      journalEntryId: explicitId,
      journalCreatedAt: Number(data.journalCreatedAt || 0) || 0,
      meta: {
        url: boundedString(data.meta?.url, 8192),
        hostname: boundedString(data.meta?.hostname, 255),
        selectionSnapshot: data.meta?.selectionSnapshot || { includes: [], excludes: [] }
      }
    }
  };
  let text = JSON.stringify(base);
  if (text.length > MAX_DATA_CHARS) {
    base.data.meta.selectionSnapshot = { includes: [], excludes: [] };
    text = JSON.stringify(base);
  }
  if (text.length > MAX_DATA_CHARS) throw new Error('legacy-source-too-large');
  return { projection: base, text };
}
function token(saltHex, text) {
  return crypto.createHash('sha256')
    .update('webclip-local-token-v1\0legacy-source\0')
    .update(Buffer.from(saltHex, 'hex'))
    .update('\0')
    .update(text)
    .digest('hex');
}

(function missingRuntimeDefaultsDoNotChangeIdentity() {
  const raw = { data: { filename: 'a.pdf', meta: { url: 'https://example.test/' } } };
  const a = sourceProjection(raw);
  const b = sourceProjection(raw);
  assert.equal(a.text, b.text);
  assert.equal(a.projection.createdAt, 0);
  assert.equal(a.projection.data.journalEntryId, '');
})();

(function generatedMaterializationFactsAreExcluded() {
  const raw = { data: { filename: 'a.pdf', meta: { url: 'https://example.test/' } } };
  const projection = sourceProjection(raw);
  const sourceToken = token('11'.repeat(32), projection.text);
  const materializationA = { ...projection.projection, generatedId: 'uuid-a', materializedAt: 100 };
  const materializationB = { ...projection.projection, generatedId: 'uuid-b', materializedAt: 200 };
  assert.equal(sourceToken, token('11'.repeat(32), sourceProjection(raw).text));
  assert.notDeepEqual(materializationA, materializationB);
})();

(function oversizedSelectionIsStrippedBeforeIdentity() {
  const huge = 'x'.repeat(MAX_DATA_CHARS + 1000);
  const projection = sourceProjection({
    data: { meta: { selectionSnapshot: { includes: [huge], excludes: [] } } }
  });
  assert.deepEqual(projection.projection.data.meta.selectionSnapshot, { includes: [], excludes: [] });
  assert.ok(projection.text.length <= MAX_DATA_CHARS);
})();

(function meaningfulBoundedDifferenceChangesToken() {
  const salt = '22'.repeat(32);
  const a = sourceProjection({ data: { filename: 'a.pdf', meta: { url: 'https://a.test/' } } });
  const b = sourceProjection({ data: { filename: 'a.pdf', meta: { url: 'https://b.test/' } } });
  assert.notEqual(token(salt, a.text), token(salt, b.text));
})();

console.log('P0-072 legacy source projection model: PASS');
