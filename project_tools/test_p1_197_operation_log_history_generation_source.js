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

const queueWrite = functionSlice('queueOperationLogWrite', 16000);
const flushWrite = functionSlice('flushOperationLogWrites', 12000);
const clearLogs = functionSlice('clearOperationLogs', 24000);
const cleanup = functionSlice('cleanupExpiredOperationLogs', 52000);
const mutateOnce = functionSlice('mutateOperationLogOnce', 42000);
const mutate = functionSlice('mutateOperationLog', 46000);
const appendOnce = functionSlice('appendOperationLogEventOnce', 42000);
const appendEvent = functionSlice('appendOperationLogEvent', 46000);

// Existing positive controls: P1-197 strengthens these; it does not require
// throwing away useful same-worker ordering or bounded maintenance.
requireSource(/operationLogWriteChains\s*=\s*new Map\s*\(/.test(worker),
  'missing current per-operation OperationLog write-chain positive control');
requireSource(Boolean(queueWrite) && /operationLogWriteChains/.test(queueWrite),
  'queueOperationLogWrite() no longer uses the write-chain positive control');
requireSource(Boolean(flushWrite) && /operationLogWriteChains/.test(flushWrite),
  'flushOperationLogWrites() positive control disappeared');
requireSource(Boolean(clearLogs), 'cannot locate clearOperationLogs()');
requireSource(/operationLogWriteChains\.values\s*\(/.test(clearLogs) && /Promise\.allSettled/.test(clearLogs),
  'manual clear no longer drains currently known write chains');
requireSource(/OPERATION_LOG_EVENT_STORE/.test(clearLogs) && /OPERATION_LOG_STORE/.test(clearLogs) && /\.clear\s*\(/.test(clearLogs),
  'manual clear no longer visibly clears both OperationLog stores');
requireSource(Boolean(cleanup), 'cannot locate cleanupExpiredOperationLogs()');
requireSource(/cleanupExpiredOperationLogs/.test(mutate) && /mutateOperationLogOnce/.test(mutate),
  'quota cleanup/retry positive control disappeared from operation mutation path');
requireSource(/cleanupExpiredOperationLogs/.test(appendEvent) && /appendOperationLogEventOnce/.test(appendEvent),
  'quota cleanup/retry positive control disappeared from event mutation path');

// Target: one durable global history generation. Naming alternatives are
// accepted, but there must be an explicit authority rather than a worker-only Map.
requireSource(
  /OPERATION_LOG_HISTORY_GENERATION|operationLogHistoryGeneration|historyGeneration/.test(worker),
  'missing durable OperationLog history-generation authority'
);
requireSource(
  /OPERATION_LOG_META_STORE|operationLogMeta|historyGeneration/.test(worker) && /indexedDB|objectStore|transaction/i.test(worker),
  'history generation is not visibly tied to durable OperationLog/IDB storage'
);

// Clear-all must advance the durable generation in the same destructive path.
requireSource(
  /historyGeneration|OPERATION_LOG_HISTORY_GENERATION|operationLogHistoryGeneration/.test(clearLogs),
  'clearOperationLogs() does not advance/check the durable history generation'
);
requireSource(
  /\.clear\s*\([\s\S]{0,5000}(?:historyGeneration|OPERATION_LOG_HISTORY_GENERATION|operationLogHistoryGeneration)|(?:historyGeneration|OPERATION_LOG_HISTORY_GENERATION|operationLogHistoryGeneration)[\s\S]{0,5000}\.clear\s*\(/.test(clearLogs),
  'generation transition and destructive clear are not source-bound in one clear path'
);

// Writers must carry expected generation and check it at the IDB mutation
// boundary. A check only before queueing is insufficient because clear/delete
// can commit before the transaction runs.
const mutationCode = `${mutateOnce}\n${appendOnce}`;
requireSource(
  /expectedHistoryGeneration|historyGenerationReceipt|operationLogGeneration/.test(queueWrite + mutate + appendEvent + mutationCode),
  'OperationLog writes do not carry an expected history-generation receipt'
);
requireSource(
  /expectedHistoryGeneration[\s\S]{0,4000}(?:current|stored|historyGeneration)|(?:current|stored|historyGeneration)[\s\S]{0,4000}expectedHistoryGeneration/.test(mutationCode),
  'IDB mutation path does not compare expected vs durable current history generation'
);
requireSource(
  /stale|generation mismatch|obsolete/i.test(mutationCode),
  'stale OperationLog writer has no explicit drop/no-op outcome'
);

// Retention/size pruning needs a per-operation fence so deleting A does not
// globally invalidate unrelated B while still preventing late A resurrection.
requireSource(
  /operationLogDeleteGeneration|operationDeletionGeneration|deletionGeneration|operationLifecycleGeneration|operationInstanceGeneration|operationLogTombstone/.test(worker),
  'missing durable per-operation deletion/lifecycle fence for retention cleanup'
);
requireSource(
  /deletionGeneration|operationLifecycleGeneration|operationInstanceGeneration|operationLogTombstone|tombstone/.test(cleanup),
  'cleanupExpiredOperationLogs() does not advance/persist a per-operation deletion fence'
);
requireSource(
  /deletionGeneration|operationLifecycleGeneration|operationInstanceGeneration|operationLogTombstone|tombstone/.test(mutationCode),
  'writer transaction does not consume the per-operation deletion/lifecycle fence'
);

// Quota retry must preserve the original receipt and re-check it. A retry that
// simply re-invokes an unfenced once-helper after cleanup can resurrect rows.
requireSource(
  /expectedHistoryGeneration|historyGenerationReceipt|operationLogGeneration/.test(mutate) &&
  /expectedHistoryGeneration|historyGenerationReceipt|operationLogGeneration/.test(appendEvent),
  'quota retry wrapper does not visibly preserve history-generation authority'
);

// Current same-worker drain is not allowed to be the sole clear authority.
requireSource(
  !(/Promise\.allSettled/.test(clearLogs) && !/historyGeneration|OPERATION_LOG_HISTORY_GENERATION|operationLogHistoryGeneration/.test(clearLogs)),
  'clear still relies only on draining worker-local chains without a durable generation transition'
);

if (failures.length) {
  console.error('P1-197 OperationLog history generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-197 OperationLog history generation source gate: PASS');
