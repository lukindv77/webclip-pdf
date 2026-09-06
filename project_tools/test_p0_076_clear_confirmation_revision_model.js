'use strict';
const assert = require('node:assert/strict');

function preview(db, scope) {
  return Object.freeze({ version: 1, scope, expectedJournalRevision: db.revision });
}
function pointMutation(db) {
  db.revision = `R${Number(db.revision.slice(1)) + 1}`;
}
function clear(db, receipt, requestedScope) {
  if (!receipt || receipt.version !== 1 || receipt.scope !== requestedScope) return { ok: false, outcome: 'invalid-authority' };
  if (receipt.expectedJournalRevision !== db.revision) return { ok: false, outcome: 'stale-journal-revision' };
  db.generation = `G${Number(db.generation.slice(1)) + 1}`;
  db.revision = `R${Number(db.revision.slice(1)) + 1}`;
  db.lastClearScope = requestedScope;
  return { ok: true, outcome: 'committed', generation: db.generation, revision: db.revision };
}

const stale = { revision: 'R1', generation: 'G1' };
const r1 = preview(stale, 'site:a.test');
pointMutation(stale);
assert.deepEqual(clear(stale, r1, 'site:a.test'), { ok: false, outcome: 'stale-journal-revision' });
assert.equal(stale.generation, 'G1', 'stale confirmation must not rotate generation or clear anything');

const fresh = { revision: 'R4', generation: 'G7' };
const r2 = preview(fresh, 'all');
const committed = clear(fresh, r2, 'all');
assert.equal(committed.outcome, 'committed');
assert.equal(fresh.generation, 'G8');
assert.equal(fresh.revision, 'R5');
assert.equal(clear(fresh, r2, 'all').outcome, 'stale-journal-revision',
  'same confirmation cannot blindly replay after a possibly-lost successful response');

const scope = { revision: 'R10', generation: 'G3' };
const r3 = preview(scope, 'site:a.test');
assert.equal(clear(scope, r3, 'site:b.test').outcome, 'invalid-authority', 'confirmation is bound to exact normalized scope');
assert.equal(scope.revision, 'R10');

console.log('P0-076 clear confirmation revision model: PASS');
