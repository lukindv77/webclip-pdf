'use strict';

const assert = require('assert/strict');

function planDelete({ destination = 'download', knownPublic = false, fileDisposition = 'keep', publicationChoice = '' } = {}) {
  if (destination !== 'yandex') {
    return { allowed: true, publicationOutcome: 'not-applicable', next: 'delete-local' };
  }
  if (!['keep', 'trash'].includes(fileDisposition)) {
    return { allowed: false, reason: 'invalid-file-disposition' };
  }
  if (!knownPublic) {
    return { allowed: true, publicationOutcome: 'not-known-public', next: fileDisposition === 'trash' ? 'move-then-delete' : 'delete-local' };
  }
  if (publicationChoice === 'revoke') {
    return { allowed: true, publicationOutcome: 'revoke-required', next: 'revoke-first' };
  }
  if (publicationChoice === 'keep-public' && fileDisposition === 'keep') {
    return { allowed: true, publicationOutcome: 'explicit-control-relinquishment', next: 'delete-local' };
  }
  if (publicationChoice === 'keep-public' && fileDisposition === 'trash') {
    return { allowed: false, reason: 'public-trash-ambiguous' };
  }
  return { allowed: false, reason: 'publication-outcome-required' };
}

function settleRevoke({ outcome, rowStillSame = true } = {}) {
  if (!rowStillSame) return { canDelete: false, state: 'stale-journal-authority' };
  if (outcome === 'revoked' || outcome === 'already-private') return { canDelete: true, state: outcome };
  if (outcome === 'unknown') return { canDelete: false, state: 'manual-publication-unknown' };
  if (outcome === 'failed') return { canDelete: false, state: 'publication-revoke-failed' };
  return { canDelete: false, state: 'invalid-revoke-outcome' };
}

function continueAfterRevoke({ revokeState, fileDisposition, moveOutcome = 'not-started' } = {}) {
  if (!['revoked', 'already-private'].includes(revokeState)) {
    return { canDelete: false, reason: 'publication-not-settled' };
  }
  if (fileDisposition === 'keep') return { canDelete: true, reason: 'publication-settled' };
  if (fileDisposition !== 'trash') return { canDelete: false, reason: 'invalid-file-disposition' };
  if (moveOutcome === 'moved') return { canDelete: true, reason: 'publication-and-move-settled' };
  if (moveOutcome === 'unknown') return { canDelete: false, reason: 'move-unknown' };
  return { canDelete: false, reason: 'move-not-settled' };
}

function applyKeepPublicAcknowledgement({ knownPublic, explicitAcknowledgement, exactEntryAuthority } = {}) {
  if (!knownPublic) return { canDelete: false, reason: 'not-a-public-control-handoff' };
  if (!explicitAcknowledgement) return { canDelete: false, reason: 'ack-required' };
  if (!exactEntryAuthority) return { canDelete: false, reason: 'stale-entry-authority' };
  return { canDelete: true, reason: 'explicit-control-relinquishment' };
}

assert.deepEqual(planDelete({ destination: 'download' }), { allowed: true, publicationOutcome: 'not-applicable', next: 'delete-local' });
assert.deepEqual(planDelete({ destination: 'yandex', knownPublic: false, fileDisposition: 'keep' }), { allowed: true, publicationOutcome: 'not-known-public', next: 'delete-local' });
assert.deepEqual(planDelete({ destination: 'yandex', knownPublic: true, fileDisposition: 'keep' }), { allowed: false, reason: 'publication-outcome-required' });
assert.deepEqual(planDelete({ destination: 'yandex', knownPublic: true, fileDisposition: 'keep', publicationChoice: 'revoke' }), { allowed: true, publicationOutcome: 'revoke-required', next: 'revoke-first' });
assert.deepEqual(planDelete({ destination: 'yandex', knownPublic: true, fileDisposition: 'keep', publicationChoice: 'keep-public' }), { allowed: true, publicationOutcome: 'explicit-control-relinquishment', next: 'delete-local' });
assert.deepEqual(planDelete({ destination: 'yandex', knownPublic: true, fileDisposition: 'trash', publicationChoice: 'keep-public' }), { allowed: false, reason: 'public-trash-ambiguous' });
assert.deepEqual(planDelete({ destination: 'yandex', knownPublic: true, fileDisposition: 'trash', publicationChoice: 'revoke' }), { allowed: true, publicationOutcome: 'revoke-required', next: 'revoke-first' });

assert.deepEqual(settleRevoke({ outcome: 'revoked' }), { canDelete: true, state: 'revoked' });
assert.deepEqual(settleRevoke({ outcome: 'already-private' }), { canDelete: true, state: 'already-private' });
assert.deepEqual(settleRevoke({ outcome: 'unknown' }), { canDelete: false, state: 'manual-publication-unknown' });
assert.deepEqual(settleRevoke({ outcome: 'failed' }), { canDelete: false, state: 'publication-revoke-failed' });
assert.deepEqual(settleRevoke({ outcome: 'revoked', rowStillSame: false }), { canDelete: false, state: 'stale-journal-authority' });

assert.deepEqual(continueAfterRevoke({ revokeState: 'revoked', fileDisposition: 'keep' }), { canDelete: true, reason: 'publication-settled' });
assert.deepEqual(continueAfterRevoke({ revokeState: 'revoked', fileDisposition: 'trash', moveOutcome: 'moved' }), { canDelete: true, reason: 'publication-and-move-settled' });
assert.deepEqual(continueAfterRevoke({ revokeState: 'revoked', fileDisposition: 'trash', moveOutcome: 'unknown' }), { canDelete: false, reason: 'move-unknown' });
assert.deepEqual(continueAfterRevoke({ revokeState: 'manual-publication-unknown', fileDisposition: 'keep' }), { canDelete: false, reason: 'publication-not-settled' });

assert.deepEqual(applyKeepPublicAcknowledgement({ knownPublic: true, explicitAcknowledgement: false, exactEntryAuthority: true }), { canDelete: false, reason: 'ack-required' });
assert.deepEqual(applyKeepPublicAcknowledgement({ knownPublic: true, explicitAcknowledgement: true, exactEntryAuthority: false }), { canDelete: false, reason: 'stale-entry-authority' });
assert.deepEqual(applyKeepPublicAcknowledgement({ knownPublic: true, explicitAcknowledgement: true, exactEntryAuthority: true }), { canDelete: true, reason: 'explicit-control-relinquishment' });

console.log('P0-069 public-link delete outcome model: PASS');
