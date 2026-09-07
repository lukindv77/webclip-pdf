'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 50000) {
  const asyncStart = worker.indexOf(`async function ${name}`);
  const syncStart = worker.indexOf(`function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

const normalizeOperationId = functionSlice('normalizeOperationIdInput', 8000);
const startOperationLog = functionSlice('startOperationLog', 18000);
const pendingIntentKey = functionSlice('makePendingLocalDownloadIntentKey', 16000);
const reconcilePendingDownload = functionSlice('findExistingDownloadForPendingIntent', 36000) ||
  functionSlice('findExistingLocalDownloadForIntent', 36000) ||
  functionSlice('reconcilePendingLocalDownloads', 70000);

// Positive controls from the current design that P1-198 should preserve where useful.
requireSource(Boolean(normalizeOperationId), 'missing current operation-id input normalization positive control');
requireSource(/randomUUID/.test(worker), 'missing opaque UUID generation positive control');
requireSource(/staged-import:/.test(worker) && /stagingId/.test(worker),
  'missing worker/domain-issued staged-import identity positive control');
requireSource(/leaseToken/.test(worker) && /ownerSessionId/.test(worker),
  'missing Journal-import lease/session ownership positive control');
requireSource(/saveAsSessionId/.test(worker),
  'missing purpose-specific Save As continuation/session positive control');

// Target 1: production needs an explicit worker-issued physical operation identity primitive.
requireSource(
  /physicalOperationId|operationInstanceId|workerOperationId|issuePhysicalOperation|createPhysicalOperation|createOperationContext/.test(worker),
  'missing explicit worker-issued physical operation identity primitive'
);

// Target 2: caller-provided operationId must be represented separately as correlation metadata.
requireSource(
  /clientOperationId|operationCorrelationId|correlationId/.test(worker),
  'caller operationId is not visibly separated as correlation/client metadata'
);

// Target 3: a new physical identity must be issued at/inside worker-side new-operation admission.
requireSource(
  /(?:createOperationContext|issuePhysicalOperation|createPhysicalOperation|physicalOperationId|operationInstanceId|workerOperationId)[\s\S]{0,2500}(?:randomUUID|makeOperationLogId)|(?:randomUUID|makeOperationLogId)[\s\S]{0,2500}(?:physicalOperationId|operationInstanceId|workerOperationId)/.test(worker),
  'worker admission does not visibly mint a fresh physical operation identity'
);

// Target 4: startOperationLog must distinguish physical identity from caller correlation.
requireSource(Boolean(startOperationLog), 'cannot locate startOperationLog()');
requireSource(
  /physicalOperationId|operationInstanceId|workerOperationId/.test(startOperationLog),
  'startOperationLog() does not consume a worker-issued physical operation identity'
);
requireSource(
  /clientOperationId|correlationId|operationCorrelationId/.test(startOperationLog),
  'startOperationLog() does not preserve caller correlation separately from physical identity'
);
requireSource(
  !/const\s+id\s*=\s*operationId\s*\|\|\s*makeOperationLogId/.test(startOperationLog),
  'startOperationLog() still allows caller operationId to select the physical log key'
);

// Target 5: pending local-download durable identity must not derive solely from caller operationId.
requireSource(Boolean(pendingIntentKey), 'cannot locate makePendingLocalDownloadIntentKey()');
requireSource(
  /physicalOperationId|operationInstanceId|pendingIntentId|downloadIntentId/.test(pendingIntentKey),
  'pending local-download intent key has no worker/domain-issued physical identity'
);
requireSource(
  !/String\s*\(\s*operationId\s*\|\|\s*['"]['"]\s*\)\.trim\s*\(\s*\)\s*\|\|/.test(pendingIntentKey),
  'pending local-download intent key still prefers caller operationId as physical namespace'
);

// Target 6: physical sameness/reconciliation cannot be decided by caller operationId equality alone.
requireSource(
  !/String\s*\(\s*existing\.operationId\s*\|\|\s*['"]['"]\s*\)\s*===\s*String\s*\(\s*intent\.operationId\s*\|\|\s*['"]['"]\s*\)/.test(worker),
  'pending download reconciliation still treats operationId equality as physical sameness'
);
requireSource(
  /physicalOperationId|operationInstanceId|pendingIntentId|downloadIntentId/.test(reconcilePendingDownload || worker),
  'pending-download reconciliation has no explicit physical/domain identity evidence'
);

// Target 7: runtime message admission must not pass caller operationId directly as the physical id
// into representative new-operation execution paths. Correlation may still be forwarded under a
// correlation-specific field.
requireSource(
  !/operationId:\s*normalizeOperationIdInput\s*\(\s*message\.operationId\s*\)/.test(worker),
  'message handlers still pass normalized caller operationId directly in the physical operationId field'
);
requireSource(
  !/fetchJournalBackupFromYandex\s*\([^,]+,\s*normalizeOperationIdInput\s*\(\s*message\.operationId\s*\)\s*\)/.test(worker),
  'cloud-import admission still passes caller operationId as the physical operation identity'
);

// Target 8: source should make the trust rule explicit enough to resist future regression.
requireSource(
  /correlation[^\n]{0,160}(?:not|never)[^\n]{0,120}(?:ownership|capability|physical)|(?:not|never)[^\n]{0,120}(?:ownership|capability)[^\n]{0,160}correlation/i.test(worker),
  'missing explicit source-level rule that correlation id is not physical ownership/capability'
);

if (failures.length) {
  console.error('P1-198 worker-issued physical operation identity source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-198 worker-issued physical operation identity source gate: PASS');
