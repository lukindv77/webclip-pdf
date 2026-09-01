'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

(function sourceBinding() {
  assert.match(source, /const PENDING_LOCAL_UNKNOWN_KIND = 'unknown';/);
  assert.match(source, /async function markPendingLocalDownloadUnknown\(/);
  assert.match(source, /recoveryState: 'manual-resolution'/);
  assert.match(source, /unknownReason: String\(reason \|\| ''\)\.slice\(0, PENDING_LOCAL_UNKNOWN_REASON_MAX_CHARS\)/);
  assert.match(source, /if \(cursor\.value\?\.kind === PENDING_LOCAL_UNKNOWN_KIND\) \{ cursor\.continue\(\); return; \}/,
    'ordinary maintenance selection must skip dead-letter/manual-resolution rows');
  assert.match(source, /let activeCount = 0; let unknownCount = 0;/,
    'active and unknown capacity must be accounted separately');
  assert.match(source, /markPendingLocalDownloadUnknown\(rawKey, reason, trigger\)/,
    'unbound intent TTL must transition to unknown, not delete');
  assert.match(source, /markPendingLocalDownloadUnknown\(id, reason, trigger\)/,
    'bound download TTL must transition to unknown, not delete');
  assert.equal(source.includes("await removePendingLocalDownload(rawKey).catch(() => {});\n        if (expectedBlobUrl)"), false,
    'old unbound TTL deletion must not return');
  assert.equal(source.includes("await removePendingLocalDownload(id).catch(() => {});\n      if (item.blobUrl)"), false,
    'old bound TTL deletion must not return');
  assert.match(source, /async function finalizePendingLocalDownload\(downloadId, state = '', downloadError = ''\) \{\n  const pending = await getPendingLocalDownload\(downloadId\);/,
    'late exact terminal receipt must still resolve any retained checkpoint, including unknown');
  assert.match(source, /const bound = \{ \.\.\.intent, downloadId: id, kind: 'download', updatedAt: Date\.now\(\) \};/,
    'late exact intent settlement must revive unknown intent into normal bound download state');
})();

function toUnknown(item, reason, trigger, now) {
  return {
    ...item,
    kind: 'unknown',
    priorKind: String(item.priorKind || item.kind || '').slice(0, 32),
    recoveryState: 'manual-resolution',
    unknownAt: Number(item.unknownAt || 0) > 0 ? Number(item.unknownAt) : now,
    updatedAt: now,
    unknownReason: String(reason || '').slice(0, 1000),
    unknownTrigger: String(trigger || '').slice(0, 120)
  };
}

function bindIntent(item, downloadId, now) {
  return { ...item, downloadId, kind: 'download', updatedAt: now };
}

function maintenanceCandidates(rows, max) {
  const out = [];
  for (const row of rows) {
    if (out.length >= max) break;
    if (row.kind === 'unknown') continue;
    out.push(row);
  }
  return out;
}

function admitCounts(rows, max) {
  let active = 0;
  let unknown = 0;
  for (const row of rows) {
    if (row.kind === 'unknown') unknown += 1;
    else active += 1;
  }
  return { active, unknown, canAdmit: active < max && unknown < max };
}

(function stateMachine() {
  const original = {
    downloadId: 'intent:op-39',
    kind: 'intent',
    createdAt: 100,
    updatedAt: 100,
    operationId: 'op-39',
    expectedBytes: 12345,
    blobUrl: 'blob:extension/39',
    data: {
      destination: 'download',
      filename: 'saved.pdf',
      meta: { url: 'https://example.test/article', title: 'Saved title', selectionSnapshot: { includes: [], excludes: [] } }
    }
  };

  const unknown = toUnknown(original, 'Chrome history missing', 'hourly', 200);
  assert.equal(unknown.kind, 'unknown');
  assert.equal(unknown.priorKind, 'intent');
  assert.equal(unknown.recoveryState, 'manual-resolution');
  assert.equal(unknown.operationId, original.operationId);
  assert.deepEqual(unknown.data, original.data, 'dead-letter must preserve the complete durable Journal metadata payload');
  assert.equal(unknown.downloadId, original.downloadId);

  assert.deepEqual(maintenanceCandidates([unknown, { downloadId: 77, kind: 'download' }], 12).map(x => x.downloadId), [77],
    'unknown rows must not loop through automatic maintenance forever');

  const rebound = bindIntent(unknown, 88, 300);
  assert.equal(rebound.downloadId, 88);
  assert.equal(rebound.kind, 'download');
  assert.deepEqual(rebound.data, original.data, 'late exact settlement must retain metadata for normal finalization');
  assert.equal(rebound.operationId, original.operationId);

  const max = 100;
  const ninetyNineUnknown = Array.from({ length: 99 }, (_, i) => ({ downloadId: `intent:u${i}`, kind: 'unknown' }));
  const ninetyNineActive = Array.from({ length: 99 }, (_, i) => ({ downloadId: i, kind: 'download' }));
  assert.deepEqual(admitCounts([...ninetyNineUnknown, ...ninetyNineActive], max), { active: 99, unknown: 99, canAdmit: true });
  assert.equal(admitCounts([...ninetyNineUnknown, ...ninetyNineActive, { downloadId: 999, kind: 'download' }], max).canAdmit, false,
    'active queue remains bounded independently');
  assert.equal(admitCounts([...ninetyNineUnknown, ...ninetyNineActive, { downloadId: 'intent:u99', kind: 'unknown' }], max).canAdmit, false,
    'dead-letter queue is also bounded and requires resolution rather than silent evidence eviction');
})();

console.log('P0-039 local download unknown/dead-letter recovery: PASS');
