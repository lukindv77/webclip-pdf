'use strict';

const assert = require('assert');

const OPERATION_LINK_VERSION = 1;

function normalizeImportedOperation(raw) {
  const historical = String(raw?.operationId || '').trim();
  const safeHistorical = /^[A-Za-z0-9._:-]{1,180}$/.test(historical) ? historical : '';
  return {
    operationId: '',
    historicalOperationId: safeHistorical,
    operationLink: null,
    operationProvenance: safeHistorical ? 'imported-unverified' : 'none'
  };
}

function mintLocalOperationLink({ entryId, operationId }) {
  if (!entryId || !/^[A-Za-z0-9._:-]{1,180}$/.test(String(operationId || ''))) return null;
  return {
    version: OPERATION_LINK_VERSION,
    provenance: 'live-local',
    entryId: String(entryId),
    operationId: String(operationId)
  };
}

function linkedOperationId(entry) {
  const link = entry?.operationLink;
  if (!link || Number(link.version) !== OPERATION_LINK_VERSION) return '';
  if (link.provenance !== 'live-local') return '';
  if (!entry?.id || String(link.entryId || '') !== String(entry.id)) return '';
  const operationId = String(link.operationId || '');
  return /^[A-Za-z0-9._:-]{1,180}$/.test(operationId) ? operationId : '';
}

const localLogId = 'op-local-123';

// Imported backup colliding with an existing local log is historical only.
let imported = normalizeImportedOperation({ operationId: localLogId });
assert.equal(imported.operationId, '');
assert.equal(imported.historicalOperationId, localLogId);
assert.equal(imported.operationProvenance, 'imported-unverified');
assert.equal(linkedOperationId({ id: 'entry-imported', ...imported }), '');

// Even a forged operationLink from backup is removed by import normalization.
imported = normalizeImportedOperation({
  operationId: localLogId,
  operationLink: {
    version: 1,
    provenance: 'live-local',
    entryId: 'entry-imported',
    operationId: localLogId
  }
});
assert.equal(imported.operationLink, null);
assert.equal(linkedOperationId({ id: 'entry-imported', ...imported }), '');

// A worker-minted live link for the same local entry remains usable.
const live = {
  id: 'entry-live',
  operationLink: mintLocalOperationLink({ entryId: 'entry-live', operationId: localLogId })
};
assert.equal(linkedOperationId(live), localLogId);

// Link cannot be transplanted to a different Journal entry.
assert.equal(linkedOperationId({ id: 'entry-other', operationLink: live.operationLink }), '');

// Legacy plain operationId without a provenance receipt is fail-closed.
assert.equal(linkedOperationId({ id: 'legacy', operationId: localLogId }), '');

// Malformed historical ids are discarded rather than used as live linkage.
imported = normalizeImportedOperation({ operationId: 'bad id with spaces' });
assert.equal(imported.historicalOperationId, '');
assert.equal(imported.operationProvenance, 'none');

console.log('P1-190 imported operation provenance model: PASS');
