'use strict';
const assert = require('node:assert/strict');

const before = {
  entry: { id: 'A', title: 'old', entryRevision: '' },
  dbRevision: 'D0',
  journalGeneration: 'G1'
};
const after = {
  entry: { id: 'A', title: 'new', entryRevision: '' },
  dbRevision: 'D1',
  journalGeneration: 'G1'
};

function splitReadSchedule() {
  // tx1 reads entry before a writer commits; writer then atomically commits
  // entry+meta; tx2 reads meta after that commit.
  const renderedEntry = structuredClone(before.entry);
  const renderedMeta = {
    dbRevision: after.dbRevision,
    journalGeneration: after.journalGeneration
  };
  return { renderedEntry, renderedMeta };
}

function sameTransactionSnapshot(version) {
  return {
    renderedEntry: structuredClone(version.entry),
    renderedMeta: {
      dbRevision: version.dbRevision,
      journalGeneration: version.journalGeneration
    }
  };
}

const mixed = splitReadSchedule();
assert.equal(mixed.renderedEntry.title, 'old');
assert.equal(mixed.renderedMeta.dbRevision, 'D1');
assert.equal(
  mixed.renderedMeta.dbRevision,
  after.dbRevision,
  'negative control: split reads can attach the current revision to stale rendered entry bytes'
);

const coherentOld = sameTransactionSnapshot(before);
assert.equal(coherentOld.renderedEntry.title, 'old');
assert.equal(coherentOld.renderedMeta.dbRevision, 'D0');

const coherentNew = sameTransactionSnapshot(after);
assert.equal(coherentNew.renderedEntry.title, 'new');
assert.equal(coherentNew.renderedMeta.dbRevision, 'D1');

function legacyMutationAllowed(current, rendered) {
  if (current.journalGeneration !== rendered.renderedMeta.journalGeneration) return false;
  if (current.dbRevision !== rendered.renderedMeta.dbRevision) return false;
  return true;
}

assert.equal(
  legacyMutationAllowed(after, coherentOld),
  false,
  'coherent legacy snapshot becomes stale after any intervening Journal mutation'
);
assert.equal(
  legacyMutationAllowed(after, mixed),
  true,
  'negative control: mixed split-read token would incorrectly authorize stale legacy entry bytes'
);

console.log('P0-076 rendered authority snapshot model: PASS');
