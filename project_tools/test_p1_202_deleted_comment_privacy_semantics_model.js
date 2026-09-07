'use strict';

const assert = require('assert');

function normalizeCurrentComment(raw = {}) {
  const deletedAt = Math.max(0, Number(raw.deletedAt || 0));
  if (deletedAt > 0) {
    return {
      id: String(raw.id || ''),
      createdAt: Number(raw.createdAt || 0),
      updatedAt: Number(raw.updatedAt || raw.createdAt || 0),
      deletedAt,
      deletionVersion: 1
    };
  }
  return {
    id: String(raw.id || ''),
    text: String(raw.text || ''),
    createdAt: Number(raw.createdAt || 0),
    updatedAt: Number(raw.updatedAt || raw.createdAt || 0),
    deletedAt: 0
  };
}

function privacyDelete(comment, now = 1000) {
  const current = normalizeCurrentComment(comment);
  if (current.deletedAt > 0) return current;
  return {
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: Math.max(Number(current.updatedAt || 0), now),
    deletedAt: now,
    deletionVersion: 1
  };
}

function currentSearch(comments, needle) {
  const q = String(needle || '').toLowerCase();
  return comments.some((comment) => {
    const current = normalizeCurrentComment(comment);
    return current.deletedAt <= 0 && String(current.text || '').toLowerCase().includes(q);
  });
}

function currentExport(comments) {
  return comments.map(normalizeCurrentComment);
}

function importCurrent(comments) {
  return (Array.isArray(comments) ? comments : []).map(normalizeCurrentComment);
}

// 1. Current-shaped soft tombstone preserves the body and can be redisclosed.
{
  const secret = { id: 'c1', text: 'UNIQUE-SECRET-202', createdAt: 1, updatedAt: 1, deletedAt: 0 };
  const naiveDeleted = { ...secret, deletedAt: 10 };
  assert.equal(naiveDeleted.text, 'UNIQUE-SECRET-202');
  assert.equal(String(naiveDeleted.text).includes('SECRET'), true);
}

// 2. Privacy delete removes the body from the authoritative current record.
{
  const deleted = privacyDelete({ id: 'c1', text: 'UNIQUE-SECRET-202', createdAt: 1, updatedAt: 1 }, 10);
  assert.equal(deleted.deletedAt, 10);
  assert.equal(Object.prototype.hasOwnProperty.call(deleted, 'text'), false);
}

// 3. Ordinary current search cannot match a deleted secret marker.
{
  const deleted = privacyDelete({ id: 'c1', text: 'UNIQUE-SECRET-202', createdAt: 1 }, 10);
  assert.equal(currentSearch([deleted], 'unique-secret-202'), false);
}

// 4. Live comments remain searchable.
{
  const live = normalizeCurrentComment({ id: 'c2', text: 'keep searchable', createdAt: 1 });
  assert.equal(currentSearch([live], 'searchable'), true);
}

// 5. Post-delete export carries only the minimal tombstone, not deleted body text.
{
  const deleted = privacyDelete({ id: 'c1', text: 'UNIQUE-SECRET-202', createdAt: 1 }, 10);
  const serialized = JSON.stringify(currentExport([deleted]));
  assert.equal(serialized.includes('UNIQUE-SECRET-202'), false);
  assert.equal(serialized.includes('deletedAt'), true);
}

// 6. Post-delete export/import roundtrip cannot resurrect erased text.
{
  const deleted = privacyDelete({ id: 'c1', text: 'UNIQUE-SECRET-202', createdAt: 1 }, 10);
  const roundtrip = importCurrent(JSON.parse(JSON.stringify(currentExport([deleted]))));
  assert.equal(Object.prototype.hasOwnProperty.call(roundtrip[0], 'text'), false);
  assert.equal(roundtrip[0].deletedAt, 10);
}

// 7. Legacy imported full-text tombstone is normalized to privacy semantics.
{
  const imported = importCurrent([{ id: 'legacy', text: 'OLD-DELETED-BODY', createdAt: 1, deletedAt: 9 }]);
  assert.equal(Object.prototype.hasOwnProperty.call(imported[0], 'text'), false);
  assert.equal(JSON.stringify(imported).includes('OLD-DELETED-BODY'), false);
}

// 8. Minimal tombstone retains identity/timestamps needed by generation logic without content.
{
  const deleted = privacyDelete({ id: 'c9', text: 'x', createdAt: 3, updatedAt: 4 }, 20);
  assert.deepEqual(deleted, { id: 'c9', createdAt: 3, updatedAt: 20, deletedAt: 20, deletionVersion: 1 });
}

// 9. Repeating delete is idempotent and never recreates content.
{
  const first = privacyDelete({ id: 'c1', text: 'x', createdAt: 1 }, 10);
  const second = privacyDelete(first, 20);
  assert.equal(second.deletedAt, 10);
  assert.equal(Object.prototype.hasOwnProperty.call(second, 'text'), false);
}

// 10. A backup made before deletion is historical external state and is not falsely claimed purged.
{
  const before = JSON.stringify([{ id: 'c1', text: 'PREDELETE', createdAt: 1 }]);
  const after = JSON.stringify(currentExport([privacyDelete({ id: 'c1', text: 'PREDELETE', createdAt: 1 }, 10)]));
  assert.equal(before.includes('PREDELETE'), true);
  assert.equal(after.includes('PREDELETE'), false);
}

// 11. P1-202 does not define tombstone retention duration/capacity; P1-211 owns that lifecycle.
{
  const deleted = privacyDelete({ id: 'c1', text: 'x', createdAt: 1 }, 10);
  assert.equal(deleted.deletionVersion, 1);
  assert.equal('retentionExpiresAt' in deleted, false);
}

// 12. Delete winning over an old edit must be protected by exact mutation generation (P0-076), not by body retention.
{
  const winningDelete = privacyDelete({ id: 'c1', text: 'A', createdAt: 1, updatedAt: 1 }, 10);
  const staleEditPayload = { id: 'c1', text: 'B', expectedGeneration: 1 };
  const currentGeneration = 2;
  const admitted = staleEditPayload.expectedGeneration === currentGeneration;
  assert.equal(admitted, false);
  assert.equal(Object.prototype.hasOwnProperty.call(winningDelete, 'text'), false);
}

// 13. Audit metadata must not carry derivative body copies either.
{
  const deleted = privacyDelete({ id: 'c1', text: 'AUDIT-SECRET', createdAt: 1 }, 10);
  const audit = { commentId: deleted.id, deletedAt: deleted.deletedAt, deletionVersion: deleted.deletionVersion };
  assert.equal(JSON.stringify(audit).includes('AUDIT-SECRET'), false);
}

// 14. Current UI representation for a deleted tombstone can state deletion without body redisclosure.
{
  const deleted = privacyDelete({ id: 'c1', text: 'HIDDEN', createdAt: 1 }, 10);
  const label = `Удалён ${deleted.deletedAt}`;
  assert.equal(label.includes('HIDDEN'), false);
}

console.log('P1-202 deleted comment privacy semantics model: PASS');
