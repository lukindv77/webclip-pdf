'use strict';
const assert = require('node:assert/strict');

function oldRecovery(snapshot, durableNow, journalNow) {
  if (journalNow.has(snapshot.id)) {
    durableNow.delete(snapshot.id);
    return 'recovered-by-existing';
  }
  return 'continue';
}

function structuredAppendAuthority(durableNow, journalNow, id) {
  const row = durableNow.get(id);
  if (!row) return 'suppressed-missing';
  if (row.journalResetDisposition) return 'suppressed-reset-detached';
  if (journalNow.has(id)) return 'existing';
  journalNow.add(id);
  return 'appended';
}

(function replacementSameIdMustNotDeleteDetachedReceipt() {
  const snapshot = { id: 'same', operationId: 'old' };
  const durable = new Map([['same', { id: 'same', operationId: 'old' }]]);
  const journal = new Set();

  durable.set('same', {
    ...durable.get('same'),
    journalResetDisposition: { version: 1, resetId: 'r1' }
  });
  journal.add('same');

  const oldDurable = new Map(durable);
  assert.equal(oldRecovery(snapshot, oldDurable, journal), 'recovered-by-existing');
  assert.equal(oldDurable.has('same'), false,
    'old pre-check incorrectly deletes reset-detached receipt before durable authority classification');

  const safeDurable = new Map(durable);
  assert.equal(structuredAppendAuthority(safeDurable, journal, 'same'), 'suppressed-reset-detached');
  assert.equal(safeDurable.has('same'), true,
    'structured authority check preserves detached receipt even when replacement Journal id exists');
})();

(function activeSameGenerationCanStillReturnExisting() {
  const durable = new Map([['id', { id: 'id', operationId: 'op' }]]);
  const journal = new Set(['id']);
  assert.equal(structuredAppendAuthority(durable, journal, 'id'), 'existing');
  assert.equal(durable.has('id'), true,
    'incidental cleanup must remain a separate compare-delete decision');
})();

console.log('P0-072 remote existing-entry precheck race model: PASS');
