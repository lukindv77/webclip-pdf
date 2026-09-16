'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function ok(value, message) { checks += 1; assert.ok(value, message); }
function eq(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }

function currentDelete(entry, action) {
  if (!entry) return { ok: false, error: 'missing-entry' };
  if (!['keep', 'trash'].includes(action)) return { ok: false, error: 'bad-action' };
  return {
    ok: true,
    localDeleted: true,
    remoteMovedToTrash: action === 'trash',
    publicationOutcome: entry.publicUrl ? 'implicit-unchanged' : 'none',
    publicUrl: entry.publicUrl || ''
  };
}

function candidateDelete(entry, input) {
  if (!entry) return { ok: false, error: 'missing-entry' };
  const action = input.diskAction;
  if (!['keep', 'trash'].includes(action)) return { ok: false, error: 'bad-action' };
  const published = Boolean(entry.publicUrl);
  if (published && !['preserve', 'revoke'].includes(input.publicationAction)) {
    return { ok: false, error: 'publication-outcome-required' };
  }
  if (input.publicationAction === 'revoke') {
    if (!input.identityVerified) return { ok: false, error: 'exact-object-required' };
    if (!input.unpublishStarted) return { ok: false, error: 'unpublish-not-started' };
    if (input.unpublishResult === 'unknown') return { ok: false, error: 'unpublish-unknown', durablePending: true };
    if (input.unpublishResult !== 'success') return { ok: false, error: 'unpublish-failed' };
  }
  return {
    ok: true,
    localDeleted: true,
    remoteMovedToTrash: action === 'trash',
    publicationOutcome: published ? input.publicationAction : 'none',
    publicUrl: published && input.publicationAction === 'preserve' ? entry.publicUrl : ''
  };
}

const unpublished = { destination: 'yandex', publicUrl: '', resourceId: 'rid-A' };
const published = { destination: 'yandex', publicUrl: 'https://disk.yandex.ru/d/abc', resourceId: 'rid-A' };

let r = currentDelete(unpublished, 'keep');
ok(r.ok, 'unpublished keep succeeds');
ok(r.localDeleted, 'local record deleted');
eq(r.publicationOutcome, 'none', 'no publication exists');

r = currentDelete(published, 'keep');
ok(r.ok, 'current published keep succeeds');
eq(r.publicationOutcome, 'implicit-unchanged', 'current path has no explicit publication outcome');
eq(r.publicUrl, published.publicUrl, 'public capability remains represented only in removed record');

r = currentDelete(published, 'trash');
ok(r.ok, 'current published trash succeeds');
ok(r.remoteMovedToTrash, 'file moved');
eq(r.publicationOutcome, 'implicit-unchanged', 'move is not revocation');

r = candidateDelete(published, { diskAction: 'keep' });
ok(!r.ok, 'published delete fails without publication choice');
eq(r.error, 'publication-outcome-required', 'explicit outcome required');

r = candidateDelete(published, { diskAction: 'trash', publicationAction: 'preserve' });
ok(r.ok, 'explicit preserve may succeed');
eq(r.publicationOutcome, 'preserve', 'preserve is durable outcome');
eq(r.publicUrl, published.publicUrl, 'public access remains intentionally recorded as preserved outcome');

r = candidateDelete(published, {
  diskAction: 'trash', publicationAction: 'revoke',
  identityVerified: false, unpublishStarted: true, unpublishResult: 'success'
});
ok(!r.ok, 'revoke requires exact remote object authority');
eq(r.error, 'exact-object-required', 'P0-022 boundary is retained');

r = candidateDelete(published, {
  diskAction: 'trash', publicationAction: 'revoke',
  identityVerified: true, unpublishStarted: false, unpublishResult: 'success'
});
ok(!r.ok, 'revoke intent cannot be claimed before API start');
eq(r.error, 'unpublish-not-started', 'no fabricated revoke');

r = candidateDelete(published, {
  diskAction: 'trash', publicationAction: 'revoke',
  identityVerified: true, unpublishStarted: true, unpublishResult: 'unknown'
});
ok(!r.ok, 'unknown revoke settlement blocks local success');
ok(r.durablePending, 'unknown settlement must remain durable');
eq(r.error, 'unpublish-unknown', 'unknown remains distinct from failure');

r = candidateDelete(published, {
  diskAction: 'trash', publicationAction: 'revoke',
  identityVerified: true, unpublishStarted: true, unpublishResult: 'failed'
});
ok(!r.ok, 'failed revoke blocks completion');
eq(r.error, 'unpublish-failed', 'failed revoke is explicit');

r = candidateDelete(published, {
  diskAction: 'trash', publicationAction: 'revoke',
  identityVerified: true, unpublishStarted: true, unpublishResult: 'success'
});
ok(r.ok, 'verified revoke can complete');
eq(r.publicationOutcome, 'revoke', 'revocation is explicit');
eq(r.publicUrl, '', 'revoked entry no longer carries public link');

for (const diskAction of ['keep', 'trash']) {
  r = candidateDelete(unpublished, { diskAction });
  ok(r.ok, `unpublished ${diskAction} remains ordinary`);
  eq(r.publicationOutcome, 'none', `unpublished ${diskAction} needs no artificial public choice`);
}

const scenarios = [
  ['published keep preserve', published, {diskAction:'keep', publicationAction:'preserve'}, true],
  ['published trash preserve', published, {diskAction:'trash', publicationAction:'preserve'}, true],
  ['published keep revoke success', published, {diskAction:'keep', publicationAction:'revoke', identityVerified:true, unpublishStarted:true, unpublishResult:'success'}, true],
  ['published trash revoke success', published, {diskAction:'trash', publicationAction:'revoke', identityVerified:true, unpublishStarted:true, unpublishResult:'success'}, true],
  ['published revoke unknown', published, {diskAction:'keep', publicationAction:'revoke', identityVerified:true, unpublishStarted:true, unpublishResult:'unknown'}, false],
  ['published revoke failure', published, {diskAction:'keep', publicationAction:'revoke', identityVerified:true, unpublishStarted:true, unpublishResult:'failed'}, false],
  ['published revoke wrong identity', published, {diskAction:'keep', publicationAction:'revoke', identityVerified:false, unpublishStarted:true, unpublishResult:'success'}, false],
];
for (const [name, entry, input, expectedOk] of scenarios) {
  r = candidateDelete(entry, input);
  eq(r.ok, expectedOk, name);
}

function outcomeReceipt({entryId, resourceId, publicUrl, action, settlement}) {
  return Object.freeze({entryId, resourceId, publicUrl, action, settlement});
}
const receipt = outcomeReceipt({
  entryId:'journal-A', resourceId:'rid-A', publicUrl:published.publicUrl,
  action:'revoke', settlement:'success'
});
eq(receipt.entryId, 'journal-A', 'receipt binds journal entry');
eq(receipt.resourceId, 'rid-A', 'receipt binds exact object');
eq(receipt.action, 'revoke', 'receipt binds publication action');
eq(receipt.settlement, 'success', 'receipt binds settlement');
ok(Object.isFrozen(receipt), 'receipt is immutable');

const currentChoiceSet = ['keep','trash'];
eq(currentChoiceSet.length, 2, 'current UI exposes two disk choices');
ok(!currentChoiceSet.includes('revoke'), 'current UI has no revoke choice');
ok(!currentChoiceSet.includes('preserve-public'), 'current UI has no explicit preserve-public choice');

const yandexSemantics = {
  publish: 'resources/publish',
  unpublish: 'resources/unpublish',
  move: 'resources/move'
};
ok(yandexSemantics.unpublish !== yandexSemantics.move, 'Yandex models unpublish separately from move');
ok(yandexSemantics.publish !== yandexSemantics.unpublish, 'publish/revoke are distinct API actions');

console.log(`P0-069 publication-outcome model: PASS ${checks} checks`);
