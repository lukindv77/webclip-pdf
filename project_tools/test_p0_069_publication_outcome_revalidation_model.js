'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function ok(value, message) { checks += 1; assert.ok(value, message); }
function eq(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }

function currentDelete({ isYandex = true, hasPublicUrl = false, diskAction = 'keep' } = {}) {
  if (isYandex && !['keep', 'trash'].includes(diskAction)) {
    return { ok: false, reason: 'invalid-disk-action' };
  }
  return {
    ok: true,
    diskAction,
    remoteFileAction: isYandex && diskAction === 'trash' ? 'move-to-webclip-trash' : 'none',
    localJournalDeleted: true,
    publicationOutcome: hasPublicUrl ? 'implicit-unchanged' : 'not-applicable',
    unpublishStarted: false,
    durablePublicationCheckpoint: false
  };
}

function candidateDelete({
  isYandex = true,
  hasPublicUrl = false,
  diskAction = 'keep',
  publicationAction = '',
  exactObjectIdentity = false,
  immutableContext = false,
  checkpointWritten = false,
  revokeStarted = false,
  revokeSettlement = 'none',
  postStateVerified = false,
  entryCasCurrent = true
} = {}) {
  if (isYandex && !['keep', 'trash'].includes(diskAction)) {
    return { ok: false, reason: 'invalid-disk-action' };
  }

  if (!isYandex || !hasPublicUrl) {
    if (!entryCasCurrent) return { ok: false, reason: 'entry-cas' };
    return { ok: true, localJournalDeleted: true, publicationOutcome: 'not-applicable' };
  }

  if (!['preserve', 'revoke'].includes(publicationAction)) {
    return { ok: false, reason: 'publication-choice-required' };
  }

  if (publicationAction === 'preserve') {
    if (!entryCasCurrent) return { ok: false, reason: 'entry-cas' };
    return {
      ok: true,
      localJournalDeleted: true,
      publicationOutcome: 'preserved-explicitly',
      durablePublicationCheckpoint: true
    };
  }

  if (!exactObjectIdentity) return { ok: false, reason: 'exact-object-required' };
  if (!immutableContext) return { ok: false, reason: 'immutable-context-required' };
  if (!checkpointWritten) return { ok: false, reason: 'checkpoint-required' };
  if (!revokeStarted) return { ok: false, reason: 'revoke-not-started' };
  if (revokeSettlement === 'unknown') {
    return { ok: false, reason: 'revoke-unknown', pendingRecovery: true, localJournalDeleted: false };
  }
  if (revokeSettlement === 'failed') {
    return { ok: false, reason: 'revoke-failed', localJournalDeleted: false };
  }
  if (revokeSettlement !== 'success') {
    return { ok: false, reason: 'revoke-unsettled', localJournalDeleted: false };
  }
  if (!postStateVerified) return { ok: false, reason: 'revoke-post-state-unverified' };
  if (!entryCasCurrent) return { ok: false, reason: 'entry-cas' };

  return {
    ok: true,
    localJournalDeleted: true,
    publicationOutcome: 'revoked-verified',
    durablePublicationCheckpoint: true
  };
}

function makePublicationReceipt({ entryId, resourceId, publicUrl, action, settlement }) {
  return Object.freeze({ entryId, resourceId, publicUrl, action, settlement });
}

// Current implementation: keep/trash settle file placement but not publication.
const currentKeep = currentDelete({ isYandex: true, hasPublicUrl: true, diskAction: 'keep' });
ok(currentKeep.ok, 'current keep is admitted');
eq(currentKeep.localJournalDeleted, true, 'current keep deletes local Journal record');
eq(currentKeep.publicationOutcome, 'implicit-unchanged', 'current keep has no explicit publication result');
eq(currentKeep.unpublishStarted, false, 'current keep does not start unpublish');
eq(currentKeep.durablePublicationCheckpoint, false, 'current keep has no publication checkpoint');

const currentTrash = currentDelete({ isYandex: true, hasPublicUrl: true, diskAction: 'trash' });
ok(currentTrash.ok, 'current trash is admitted');
eq(currentTrash.remoteFileAction, 'move-to-webclip-trash', 'current trash is a file-placement operation');
eq(currentTrash.publicationOutcome, 'implicit-unchanged', 'current trash does not settle publication');
eq(currentTrash.unpublishStarted, false, 'moving a file is not an explicit unpublish call');

// Unpublished / local entries remain a positive control.
const ordinary = candidateDelete({ isYandex: true, hasPublicUrl: false, diskAction: 'keep', entryCasCurrent: true });
ok(ordinary.ok, 'unpublished entry can follow ordinary delete path');
eq(ordinary.publicationOutcome, 'not-applicable', 'unpublished entry does not invent publication work');
eq(ordinary.localJournalDeleted, true, 'unpublished entry can be removed locally');

const localEntry = candidateDelete({ isYandex: false, hasPublicUrl: false, entryCasCurrent: true });
ok(localEntry.ok, 'local-download entry needs no Yandex publication outcome');
eq(localEntry.publicationOutcome, 'not-applicable', 'local entry is publication-neutral');

// Published entries require an independent publication choice.
const noChoice = candidateDelete({ isYandex: true, hasPublicUrl: true, diskAction: 'keep' });
eq(noChoice.ok, false, 'published entry cannot delete without publication choice');
eq(noChoice.reason, 'publication-choice-required', 'missing publication choice fails closed');

const preserve = candidateDelete({
  isYandex: true,
  hasPublicUrl: true,
  diskAction: 'keep',
  publicationAction: 'preserve',
  entryCasCurrent: true
});
ok(preserve.ok, 'explicit preserve is a valid outcome');
eq(preserve.publicationOutcome, 'preserved-explicitly', 'preserve is recorded explicitly');
eq(preserve.localJournalDeleted, true, 'explicit preserve can allow local deletion');
eq(preserve.durablePublicationCheckpoint, true, 'preserve has durable outcome receipt');

const preserveTrash = candidateDelete({
  isYandex: true,
  hasPublicUrl: true,
  diskAction: 'trash',
  publicationAction: 'preserve',
  entryCasCurrent: true
});
ok(preserveTrash.ok, 'file placement and publication outcome are independent');
eq(preserveTrash.publicationOutcome, 'preserved-explicitly', 'trash does not redefine public access');

// Revoke requires exact object identity and immutable context.
const weakIdentity = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: false, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true
});
eq(weakIdentity.ok, false, 'revoke rejects weak path/name identity');
eq(weakIdentity.reason, 'exact-object-required', 'P0-022 identity is required');

const mutableContext = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: false, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true
});
eq(mutableContext.ok, false, 'revoke rejects mutable account/root context');
eq(mutableContext.reason, 'immutable-context-required', 'P0-074 context is required');

const noCheckpoint = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: false,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true
});
eq(noCheckpoint.ok, false, 'revoke requires durable intent before side effect');
eq(noCheckpoint.reason, 'checkpoint-required', 'checkpoint omission fails closed');

const noRevoke = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: false, revokeSettlement: 'none', postStateVerified: false
});
eq(noRevoke.ok, false, 'requested revoke cannot be replaced by file movement');
eq(noRevoke.reason, 'revoke-not-started', 'explicit unpublish/revoke must start');

const unknown = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'unknown', postStateVerified: false
});
eq(unknown.ok, false, 'unknown revoke settlement is not success');
eq(unknown.reason, 'revoke-unknown', 'unknown outcome is classified');
eq(unknown.pendingRecovery, true, 'unknown outcome remains recoverable');
eq(unknown.localJournalDeleted, false, 'control record is not discarded on unknown settlement');

const failed = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'keep', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'failed', postStateVerified: false
});
eq(failed.ok, false, 'failed revoke blocks delete success');
eq(failed.reason, 'revoke-failed', 'failed revoke is explicit');
eq(failed.localJournalDeleted, false, 'failed revoke preserves local control state');

const unverified = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: false
});
eq(unverified.ok, false, 'API success alone is insufficient');
eq(unverified.reason, 'revoke-post-state-unverified', 'public post-state must be verified');

const staleEntry = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true,
  entryCasCurrent: false
});
eq(staleEntry.ok, false, 'late revoke cannot delete replacement Journal entry');
eq(staleEntry.reason, 'entry-cas', 'P0-076 CAS still gates local mutation');

const revoked = candidateDelete({
  isYandex: true, hasPublicUrl: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true,
  entryCasCurrent: true
});
ok(revoked.ok, 'verified revoke can complete');
eq(revoked.publicationOutcome, 'revoked-verified', 'verified revoke has explicit outcome');
eq(revoked.localJournalDeleted, true, 'local deletion happens after settlement and CAS');
eq(revoked.durablePublicationCheckpoint, true, 'revoke retains durable receipt');

const receipt = makePublicationReceipt({
  entryId: 'journal-1', resourceId: 'resource-1', publicUrl: 'https://example.invalid/public-capability',
  action: 'revoke', settlement: 'success'
});
ok(Object.isFrozen(receipt), 'publication receipt is immutable');
eq(receipt.entryId, 'journal-1', 'receipt binds Journal entry');
eq(receipt.resourceId, 'resource-1', 'receipt binds exact remote object');
eq(receipt.action, 'revoke', 'receipt binds requested publication action');
eq(receipt.settlement, 'success', 'receipt binds external settlement');

// Publish, unpublish and path movement are distinct authorities.
const actions = new Set(['publish', 'unpublish', 'move']);
eq(actions.size, 3, 'publish/unpublish/move are distinct operations');
ok(actions.has('unpublish'), 'explicit unpublish authority exists as its own concept');

console.log(`P0-069 publication-outcome model: PASS ${checks} checks`);
