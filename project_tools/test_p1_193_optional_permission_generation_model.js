'use strict';
const assert = require('assert');

function currentOneClickFlow({ activationBudget, asyncSteps }) {
  const remaining = activationBudget - asyncSteps;
  return remaining > 0 ? 'permission-request-admitted' : 'lost-user-activation';
}

function discoverCandidate(tabId, documentId, origins) {
  return { version: 1, tabId, documentId, origins: [...origins], candidateId: `${tabId}:${documentId}` };
}

function immediateGrant(candidate, permissionResult, currentDocumentId) {
  if (!permissionResult) return { outcome: 'denied', inject: false };
  if (currentDocumentId !== candidate.documentId) return { outcome: 'stale-document', inject: false };
  return { outcome: 'granted-current-document', inject: true };
}

assert.equal(currentOneClickFlow({ activationBudget: 2, asyncSteps: 5 }), 'lost-user-activation');
const a = discoverCandidate(5, 'DOC-A', ['https://frame.example']);
assert.deepEqual(a.origins, ['https://frame.example']);
assert.deepEqual(immediateGrant(a, true, 'DOC-B'), { outcome: 'stale-document', inject: false });
assert.deepEqual(immediateGrant(a, true, 'DOC-A'), { outcome: 'granted-current-document', inject: true });
assert.deepEqual(immediateGrant(a, false, 'DOC-A'), { outcome: 'denied', inject: false });

console.log('P1-193 optional permission/document generation model: PASS');
