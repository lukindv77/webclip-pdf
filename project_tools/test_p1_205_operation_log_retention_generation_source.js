'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

// Positive controls that must remain.
requireSource(/operationLogWriteChains/.test(worker), 'missing per-operation OperationLog write-chain positive control');
requireSource(/cleanupExpiredOperationLogs/.test(worker), 'missing OperationLog retention cleanup surface');
requireSource(/OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS/.test(worker), 'missing bounded OperationLog IDB transaction deadline');
requireSource(/deleteOperationLogEventsInTransaction/.test(worker), 'missing operation+events cleanup positive control');
requireSource(/updatedAt/.test(worker) && /retentionHours/.test(worker), 'missing TTL/updatedAt retention positive control');
requireSource(/MAX_OPERATION_LOG_TOTAL_JSON_CHARS/.test(worker), 'missing aggregate OperationLog size bound positive control');

// Target 1: one durable history/meta authority composes clear and retention.
requireSource(/OPERATION_LOG_(?:META|HISTORY)_STORE|operationLog(?:Meta|History)Store/i.test(worker),
  'no durable OperationLog meta/history store');
requireSource(/globalHistoryEpoch|operationLogHistoryEpoch|historyGeneration/i.test(worker),
  'no durable global OperationLog history epoch/generation for P1-197 composition');

// Target 2: exact per-operation diagnostic generation / retirement fence exists.
requireSource(/operationHistoryGeneration|operationLogGeneration|retiredThroughGeneration|retiredOperationGeneration/i.test(worker),
  'no per-operation history generation/retirement fence');
requireSource(/OperationLogWriteReceipt|operationLogWriteReceipt|historyReceipt/i.test(worker),
  'no immutable OperationLog write receipt');

// Target 3: header writer checks receipt/fence before default creation or put.
requireSource(
  /mutateOperationLogOnce[\s\S]{0,12000}(?:operationHistoryGeneration|operationLogGeneration|historyReceipt|retiredThrough)/i.test(worker),
  'header writer is not visibly generation-fenced'
);
requireSource(
  /mutateOperationLogOnce[\s\S]{0,12000}(?:stale|retired)[\s\S]{0,5000}(?:put|create|record)/i.test(worker),
  'header writer has no visible stale/retired admission before write'
);

// Target 4: event writer uses the same exact fence before recreating header/events.
requireSource(
  /appendOperationLogEventOnce[\s\S]{0,14000}(?:operationHistoryGeneration|operationLogGeneration|historyReceipt|retiredThrough)/i.test(worker),
  'event writer is not visibly generation-fenced'
);
requireSource(
  /appendOperationLogEventOnce[\s\S]{0,14000}(?:stale|retired)/i.test(worker),
  'event writer has no visible stale/retired rejection path'
);

// Target 5: TTL and size pruning both publish retirement authority, not bare delete only.
requireSource(
  /cleanupExpiredOperationLogs[\s\S]{0,22000}(?:retireOperationLog|retiredThrough|operationHistoryGeneration|operationLogGeneration)/i.test(worker),
  'retention cleanup does not visibly retire the exact operation generation'
);
requireSource(
  /MAX_OPERATION_LOG_TOTAL_JSON_CHARS[\s\S]{0,18000}(?:retireOperationLog|retiredThrough|operationHistoryGeneration|operationLogGeneration)/i.test(worker),
  'size-pressure pruning does not visibly use the same retirement fence'
);

// Target 6: retirement and deletion share one authoritative readwrite transaction.
requireSource(
  /(?:retireOperationLog|cleanupExpiredOperationLogs)[\s\S]{0,18000}transaction\([^)]*(?:OPERATION_LOG_(?:META|HISTORY)_STORE|meta|history)[^)]*['"]readwrite['"]/i.test(worker)
    || /transaction\([^)]*(?:OPERATION_LOG_(?:META|HISTORY)_STORE|meta|history)[^)]*['"]readwrite['"][\s\S]{0,18000}(?:cursor\.delete|operationStore\.delete|deleteOperationLogEventsInTransaction)/i.test(worker),
  'retirement fence and physical delete are not visibly atomic in one readwrite transaction'
);

// Target 7: quota retry preserves the original receipt rather than recapturing authority.
requireSource(
  /(?:mutateOperationLog|appendOperationLogEventDurable)[\s\S]{0,18000}(?:receipt|historyGeneration|operationGeneration)[\s\S]{0,12000}cleanupExpiredOperationLogs[\s\S]{0,8000}(?:receipt|historyGeneration|operationGeneration)/i.test(worker),
  'quota cleanup/retry does not visibly preserve an original OperationLog generation receipt'
);
requireSource(
  !/cleanupExpiredOperationLogs[\s\S]{0,5000}(?:issue|begin|capture|new).*OperationLog.*(?:Generation|Receipt)/i.test(worker),
  'quota/cleanup path appears able to reacquire fresh OperationLog authority after retirement'
);

// Target 8: P1-198 physical identity is distinct from caller correlation.
requireSource(/physicalOperationId|operationInstanceId/i.test(worker),
  'missing worker-issued physical operation identity composition from P1-198');
requireSource(/clientOperationId|correlationId/i.test(worker),
  'missing separate caller correlation metadata');

// Target 9: per-operation retirement must not globally stale unrelated live writers.
requireSource(/retired.*(?:Map|Store|Generation)|retireOperationLog/i.test(worker),
  'no per-operation retirement primitive; implementation may over-fence all current writers');

// Target 10: current maintenance remains bounded and no global unbounded flush is substituted.
requireSource(/MAINTENANCE_IDB_TX_TIMEOUT_MS/.test(worker), 'missing bounded maintenance transaction positive control');
requireSource(!/cleanupExpiredOperationLogs[\s\S]{0,2500}Promise\.allSettled\(\[\.\.\.operationLogWriteChains\.values\(\)\]\)/i.test(worker),
  'retention cleanup globally drains every write chain instead of bounded/per-operation linearization');

if (failures.length) {
  console.error('P1-205 OperationLog retention generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-205 OperationLog retention generation source gate: PASS');
