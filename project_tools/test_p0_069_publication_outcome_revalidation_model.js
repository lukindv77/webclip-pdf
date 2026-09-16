'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}

function currentDelete({ published, diskAction }) {
  if (!['keep', 'trash'].includes(diskAction)) throw new Error('bad disk action');
  return {
    localJournalDeleted: true,
    diskAction,
    publicationOutcome: published ? 'implicit-unknown' : 'not-applicable',
    unpublishStarted: false,
    durablePublicationCheckpoint: false
  };
}

function candidateDelete({
  published,
  diskAction,
  publicationAction = '',
  exactObjectIdentity = false,
  immutableContext = false,
  checkpointWritten = false,
  revokeStarted = false,
  revokeSettlement = 'none',
  postStateVerified = false,
  entryCasCurrent = true
}) {
  if (!['keep', 'trash'].includes(diskAction)) return { ok: false, reason: 'disk-action' };
  if (!published) {
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

function publicationReceipt({ entryId, resourceId, publicUrl, action, settlement }) {
  return Object.freeze({ entryId, resourceId, publicUrl, action, settlement });
}

// Current implementation admits published-entry deletion without publication settlement.
const curKeep = currentDelete({ published: true, diskAction: 'keep' });
check(curKeep.localJournalDeleted === true, 'current keep deletes local Journal record');
check(curKeep.publicationOutcome === 'implicit-unknown', 'current keep has no explicit publication result');
check(curKeep.unpublishStarted === false, 'current keep does not unpublish');
check(curKeep.durablePublicationCheckpoint === false, 'current keep has no publication checkpoint');

const curTrash = currentDelete({ published: true, diskAction: 'trash' });
check(curTrash.localJournalDeleted === true, 'current trash deletes local Journal record');
check(curTrash.diskAction === 'trash', 'current trash is only a file-placement action');
check(curTrash.publicationOutcome === 'implicit-unknown', 'current trash does not prove publication outcome');
check(curTrash.unpublishStarted === false, 'moving a file is not an explicit unpublish call');

// Unpublished positive control.
const ordinary = candidateDelete({ published: false, diskAction: 'keep', entryCasCurrent: true });
check(ordinary.ok === true, 'unpublished entry can follow ordinary delete path');
check(ordinary.publicationOutcome === 'not-applicable', 'unpublished entry does not invent publication work');
check(ordinary.localJournalDeleted === true, 'unpublished entry can be removed locally');

// Published entries require an independent publication choice.
const noPublicationChoice = candidateDelete({ published: true, diskAction: 'keep' });
check(noPublicationChoice.ok === false, 'published entry cannot delete without publication choice');
check(noPublicationChoice.reason === 'publication-choice-required', 'missing publication choice fails closed');

const preserve = candidateDelete({
  published: true,
  diskAction: 'keep',
  publicationAction: 'preserve',
  entryCasCurrent: true
});
check(preserve.ok === true, 'explicit preserve is a valid outcome');
check(preserve.publicationOutcome === 'preserved-explicitly', 'preserve is recorded explicitly');
check(preserve.localJournalDeleted === true, 'explicit preserve can allow local deletion');
check(preserve.durablePublicationCheckpoint === true, 'preserve must have a durable publication receipt');

const preserveTrash = candidateDelete({
  published: true,
  diskAction: 'trash',
  publicationAction: 'preserve',
  entryCasCurrent: true
});
check(preserveTrash.ok === true, 'file placement and publication outcome are independent');
check(preserveTrash.publicationOutcome === 'preserved-explicitly', 'trash does not silently redefine public access');

// Revoke requires exact identity and immutable context.
const weakIdentity = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: false, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true
});
check(weakIdentity.ok === false, 'revoke rejects weak path/name identity');
check(weakIdentity.reason === 'exact-object-required', 'P0-022 identity is required');

const mutableContext = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: false, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true
});
check(mutableContext.ok === false, 'revoke rejects mutable account/root context');
check(mutableContext.reason === 'immutable-context-required', 'P0-074 context is required');

const noCheckpoint = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: false,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true
});
check(noCheckpoint.ok === false, 'revoke requires durable intent before side effect');
check(noCheckpoint.reason === 'checkpoint-required', 'checkpoint omission fails closed');

const noRevoke = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: false, revokeSettlement: 'none', postStateVerified: false
});
check(noRevoke.ok === false, 'requested revoke cannot be replaced by file movement');
check(noRevoke.reason === 'revoke-not-started', 'explicit unpublish/revoke must start');

const unknown = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'unknown', postStateVerified: false
});
check(unknown.ok === false, 'unknown revoke settlement is not success');
check(unknown.reason === 'revoke-unknown', 'unknown outcome is classified');
check(unknown.pendingRecovery === true, 'unknown outcome remains recoverable');
check(unknown.localJournalDeleted === false, 'control record is not discarded on unknown settlement');

const failed = candidateDelete({
  published: true, diskAction: 'keep', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'failed', postStateVerified: false
});
check(failed.ok === false, 'failed revoke blocks delete success');
check(failed.reason === 'revoke-failed', 'failed revoke is explicit');
check(failed.localJournalDeleted === false, 'failed revoke preserves local control state');

const successWithoutVerify = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: false
});
check(successWithoutVerify.ok === false, 'transport/API success alone is insufficient');
check(successWithoutVerify.reason === 'revoke-post-state-unverified', 'public post-state must be verified');

const staleEntry = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true,
  entryCasCurrent: false
});
check(staleEntry.ok === false, 'late revoke cannot delete replacement Journal entry');
check(staleEntry.reason === 'entry-cas', 'P0-076 CAS still gates local mutation');

const revoked = candidateDelete({
  published: true, diskAction: 'trash', publicationAction: 'revoke',
  exactObjectIdentity: true, immutableContext: true, checkpointWritten: true,
  revokeStarted: true, revokeSettlement: 'success', postStateVerified: true,
  entryCasCurrent: true
});
check(revoked.ok === true, 'verified revoke can complete');
check(revoked.publicationOutcome === 'revoked-verified', 'verified revoke has explicit outcome');
check(revoked.localJournalDeleted === true, 'local deletion happens only after settlement and CAS');
check(revoked.durablePublicationCheckpoint === true, 'revoke retains durable receipt');

const receipt = publicationReceipt({
  entryId: 'journal-1', resourceId: 'resource-1', publicUrl: 'https://example.invalid/public-capability',
  action: 'revoke', settlement: 'success'
});
check(Object.isFrozen(receipt), 'publication receipt is immutable');
check(receipt.entryId === 'journal-1', 'receipt binds Journal entry');
check(receipt.resourceId === 'resource-1', 'receipt binds exact remote object');
check(receipt.action === 'revoke', 'receipt binds requested publication action');
check(receipt.settlement === 'success', 'receipt binds external settlement');

// Publish, unpublish and path movement are distinct authorities.
const actions = new Set(['publish', 'unpublish', 'move']);
check(actions.size === 3, 'publish/unpublish/move are distinct operations');
check(actions.has('unpublish'), 'explicit unpublish authority exists as its own concept');

console.log(`P0-069 publication-outcome model: PASS ${checks} checks`);
