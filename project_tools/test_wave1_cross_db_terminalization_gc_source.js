'use strict';
const fs = require('fs');
const assert = require('assert');
const worker = fs.readFileSync('service-worker.js','utf8');

function requireAny(patterns,label) {
  assert.ok(patterns.some(p=>p.test(worker)), label);
}

requireAny([/domainFingerprint/,/DomainTerminalSnapshot/], 'worker must persist exact Journal-domain terminal archive identity');
requireAny([/terminalOutcome/,/retryDisposition[\s\S]{0,300}operationClass/], 'worker must preserve domain terminal semantics');
requireAny([/recordRevision[\s\S]{0,300}journalFinalizations/,/journalFinalizations[\s\S]{0,300}recordRevision/], 'F revision required');
requireAny([/recordRevision[\s\S]{0,300}pendingRemoteMutations/,/pendingRemoteMutations[\s\S]{0,300}recordRevision/], 'E revision required');
requireAny([/readDomainTerminalSnapshot/,/DOMAIN_NOT_SEALED/], 'terminal snapshot helper required');
requireAny([/archiveOperationTerminalFromDomain/,/OPERATION_TERMINAL_CONFLICT/], 'idempotent/conflict terminal archive required');
requireAny([/gcArchivedJournalDomain/,/DOMAIN_ARCHIVE_STALE/], 'compare-before-delete domain GC required');
requireAny([/physicalOperationId[\s\S]{0,400}unique\s*:\s*true/,/unique\s*:\s*true[\s\S]{0,400}physicalOperationId/], 'one F root per P should be storage-fenced');

console.log('Wave 1 cross-DB terminalization/GC source gate: PASS');
