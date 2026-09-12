'use strict';

// Owner marker for PR contract: P0-072
// Adjacent existing owner kept separate: P0-076

const crypto = require('crypto');

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`FAIL ${checks}: ${message}`);
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function makeState() {
  return {
    journalGeneration: 1,
    journal: new Map(),
    pendingDownloads: new Map(),
    pendingRemote: new Map(),
    externalDownloads: new Map(),
    externalRemote: new Map(),
    sideEffectLedger: new Map(),
    operationLog: []
  };
}

function seedJournalEntry(state, id, url = 'https://example.test/a') {
  state.journal.set(id, {
    id,
    url,
    generation: state.journalGeneration,
    readingMode: 'later',
    remotePath: '/WebClip/ReadmeLater/a.pdf'
  });
}

function startCurrentLocalDownload(state, operationId, url) {
  const key = `intent:${operationId}`;
  state.pendingDownloads.set(key, {
    key,
    operationId,
    phase: 'admitted-unknown',
    journalGeneration: state.journalGeneration,
    data: { id: `journal:${operationId}`, url }
  });
  // Once chrome.downloads.download() is invoked, the browser-owned effect may
  // continue independently of later IndexedDB checkpoint deletion.
  state.externalDownloads.set(operationId, { state: 'in_progress', filename: `${operationId}.pdf` });
  return key;
}

function settleCurrentLocalDownload(state, operationId, key) {
  const external = state.externalDownloads.get(operationId);
  external.state = 'complete';
  const checkpoint = state.pendingDownloads.get(key);
  if (!checkpoint) {
    state.operationLog.push({ operationId, status: 'partial', reason: 'checkpoint-removed-by-reset' });
    return { cancelledByReset: true, journalAppended: false };
  }
  state.journal.set(checkpoint.data.id, {
    ...checkpoint.data,
    generation: state.journalGeneration,
    localDownloaded: true
  });
  state.pendingDownloads.delete(key);
  return { cancelledByReset: false, journalAppended: true };
}

function startCurrentRemoteUpload(state, operationId, url, bytes) {
  const id = `remote:${operationId}`;
  state.pendingRemote.set(id, {
    id,
    operationId,
    phase: 'admitted-unknown',
    expectedBytes: Buffer.byteLength(bytes),
    journalGeneration: state.journalGeneration,
    data: { id: `journal:${operationId}`, url, contentSha256: digest(bytes) }
  });
  state.externalRemote.set(operationId, {
    state: 'in_progress',
    path: `/WebClip/Upload/${operationId}.pdf`,
    contentSha256: digest(bytes)
  });
  return id;
}

function settleCurrentRemoteUpload(state, operationId, id) {
  const external = state.externalRemote.get(operationId);
  external.state = 'complete';
  const checkpoint = state.pendingRemote.get(id);
  if (!checkpoint) {
    state.operationLog.push({ operationId, status: 'partial', reason: 'remote-checkpoint-removed-by-reset' });
    return { cancelledByReset: true, journalAppended: false };
  }
  state.journal.set(checkpoint.data.id, {
    ...checkpoint.data,
    generation: state.journalGeneration,
    remotePath: external.path,
    remoteUploaded: true
  });
  state.pendingRemote.delete(id);
  return { cancelledByReset: false, journalAppended: true };
}

function currentClearAll(state) {
  state.journalGeneration += 1;
  state.journal.clear();
  state.pendingDownloads.clear();
  state.pendingRemote.clear();
}

function currentClearUrl(state, url) {
  state.journalGeneration += 1;
  for (const [id, entry] of state.journal) if (entry.url === url) state.journal.delete(id);
  for (const [key, row] of state.pendingDownloads) if (row.data.url === url) state.pendingDownloads.delete(key);
  for (const [key, row] of state.pendingRemote) if (row.data.url === url) state.pendingRemote.delete(key);
}

function currentImportReplace(state, importedEntries) {
  state.journalGeneration += 1;
  state.journal.clear();
  state.pendingDownloads.clear();
  state.pendingRemote.clear();
  for (const entry of importedEntries) {
    state.journal.set(entry.id, { ...entry, generation: state.journalGeneration });
  }
}

function startCurrentReadMove(state, id, operationId) {
  const entry = state.journal.get(id);
  if (!entry) throw new Error('missing entry');
  entry.readMovePendingAt = Date.now();
  entry.readMoveOperationId = operationId;
  entry.readMoveTargetPath = `/WebClip/Upload/${id}.pdf`;
  state.externalRemote.set(operationId, {
    state: 'in_progress',
    kind: 'read-move',
    targetPath: entry.readMoveTargetPath
  });
}

function settleCurrentReadMoveAfterRestart(state, id, operationId) {
  const external = state.externalRemote.get(operationId);
  external.state = 'complete';
  // Recovery authority is co-located in the replaceable Journal entry.
  const current = state.journal.get(id);
  if (!current || current.readMoveOperationId !== operationId) {
    return { durableRecoveryReceipt: false, replacementMutated: false };
  }
  current.readingMode = 'read';
  current.remotePath = external.targetPath;
  delete current.readMovePendingAt;
  delete current.readMoveOperationId;
  delete current.readMoveTargetPath;
  return { durableRecoveryReceipt: true, replacementMutated: false };
}

function admitCandidateEffect(state, { operationId, kind, phase, url, sourceEntryId = '', targetPath = '' }) {
  const id = `effect:${operationId}`;
  state.sideEffectLedger.set(id, {
    id,
    operationId,
    kind,
    phase,
    url,
    sourceJournalGeneration: state.journalGeneration,
    sourceEntryId,
    targetPath,
    terminal: false,
    supersededByReset: false
  });
  return id;
}

function candidateBulkReset(state, { importedEntries = null, url = '' } = {}) {
  const oldGeneration = state.journalGeneration;
  for (const row of state.sideEffectLedger.values()) {
    if (url && row.url !== url) continue;
    if (row.phase === 'prepared') {
      row.phase = 'cancelled-before-admission';
      row.terminal = true;
    } else if (!row.terminal) {
      row.supersededByReset = true;
    }
  }

  state.journalGeneration += 1;
  if (importedEntries) {
    state.journal.clear();
    for (const entry of importedEntries) state.journal.set(entry.id, { ...entry, generation: state.journalGeneration });
  } else if (url) {
    for (const [id, entry] of state.journal) if (entry.url === url) state.journal.delete(id);
  } else {
    state.journal.clear();
  }

  // Old checkpoint tables may be compacted only after external-effect rows are
  // transferred/preserved in the independent ledger.
  for (const [key, row] of state.pendingDownloads) {
    if ((!url || row.data.url === url) && row.journalGeneration === oldGeneration) state.pendingDownloads.delete(key);
  }
  for (const [key, row] of state.pendingRemote) {
    if ((!url || row.data.url === url) && row.journalGeneration === oldGeneration) state.pendingRemote.delete(key);
  }
}

function settleCandidateEffect(state, ledgerId, outcome = {}) {
  const row = state.sideEffectLedger.get(ledgerId);
  if (!row) throw new Error('missing side-effect receipt');
  row.phase = outcome.ok ? 'settled-success' : 'settled-failure';
  row.terminal = true;
  row.outcome = { ...outcome };
  // A receipt from an older Journal generation is reconciled as history; it
  // never recreates or mutates replacement Journal records by id.
  const mayMutateCurrentJournal = row.sourceJournalGeneration === state.journalGeneration && !row.supersededByReset;
  return { mayMutateCurrentJournal, receipt: row };
}

// 1. Current local-download checkpoint deletion is not download cancellation.
{
  const state = makeState();
  const key = startCurrentLocalDownload(state, 'L1', 'https://example.test/a');
  assert(state.pendingDownloads.has(key), 'local durable intent exists before clear');
  assert(state.externalDownloads.get('L1').state === 'in_progress', 'browser-owned download is admitted');
  currentClearAll(state);
  assert(!state.pendingDownloads.has(key), 'clear(all) deletes pending local-download checkpoint');
  assert(state.externalDownloads.get('L1').state === 'in_progress', 'checkpoint deletion does not cancel browser-owned download');
  const result = settleCurrentLocalDownload(state, 'L1', key);
  assert(result.cancelledByReset === true, 'late local finalizer treats missing checkpoint as reset cancellation');
  assert(result.journalAppended === false, 'late local finalizer does not restore journal metadata');
  assert(state.externalDownloads.get('L1').state === 'complete', 'physical local effect still completes');
  assert(state.pendingDownloads.size === 0, 'no durable local recovery row remains after completion');
}

// 2. URL-scoped clear has the same admitted-effect loss envelope.
{
  const state = makeState();
  const key = startCurrentLocalDownload(state, 'L2', 'https://example.test/a');
  startCurrentLocalDownload(state, 'L3', 'https://example.test/b');
  currentClearUrl(state, 'https://example.test/a');
  assert(!state.pendingDownloads.has(key), 'URL clear prunes matching admitted local checkpoint');
  assert([...state.pendingDownloads.values()].some((r) => r.operationId === 'L3'), 'URL clear preserves unrelated local checkpoint');
  assert(state.externalDownloads.get('L2').state === 'in_progress', 'matching physical effect remains in progress');
}

// 3. Current remote upload/publication checkpoint can be erased while remote work survives.
{
  const state = makeState();
  const id = startCurrentRemoteUpload(state, 'R1', 'https://example.test/a', 'PDF-A');
  assert(state.pendingRemote.has(id), 'remote checkpoint exists before import');
  currentImportReplace(state, [{ id: 'imported', url: 'https://imported.test/' }]);
  assert(!state.pendingRemote.has(id), 'import-replace deletes pending remote checkpoint');
  assert(state.externalRemote.get('R1').state === 'in_progress', 'remote side effect is not cancelled by IndexedDB replacement');
  const result = settleCurrentRemoteUpload(state, 'R1', id);
  assert(result.cancelledByReset === true, 'late remote finalizer sees reset-cancelled checkpoint');
  assert(state.externalRemote.get('R1').state === 'complete', 'remote object may still settle successfully');
  assert(state.journal.has('imported'), 'replacement journal survives remote settlement');
  assert(!state.journal.has('journal:R1'), 'remote object has no journal linkage after checkpoint loss');
}

// 4. Read-move recovery is co-located with the replaceable Journal generation.
{
  const state = makeState();
  seedJournalEntry(state, 'entry-1');
  startCurrentReadMove(state, 'entry-1', 'M1');
  assert(state.journal.get('entry-1').readMoveOperationId === 'M1', 'read-move checkpoint is stored on source entry');
  currentImportReplace(state, [{ id: 'replacement-1', url: 'https://replacement.test/' }]);
  assert(!state.journal.has('entry-1'), 'import removes the co-located read-move checkpoint');
  const result = settleCurrentReadMoveAfterRestart(state, 'entry-1', 'M1');
  assert(result.durableRecoveryReceipt === false, 'after restart there is no independent durable read-move receipt');
  assert(state.externalRemote.get('M1').state === 'complete', 'remote move may still have completed');
}

// 5. Candidate rule: prepared-only work may be cancelled by reset.
{
  const state = makeState();
  const ledgerId = admitCandidateEffect(state, {
    operationId: 'P1', kind: 'local-download', phase: 'prepared', url: 'https://example.test/a'
  });
  candidateBulkReset(state);
  const row = state.sideEffectLedger.get(ledgerId);
  assert(row.terminal === true, 'prepared-only effect becomes terminal during reset');
  assert(row.phase === 'cancelled-before-admission', 'prepared-only effect is explicitly cancelled before admission');
  assert(row.supersededByReset === false, 'pre-admission cancellation is not unknown external settlement');
}

// 6. Candidate rule: admitted/unknown local effect survives reset as receipt, not Journal resurrection.
{
  const state = makeState();
  const ledgerId = admitCandidateEffect(state, {
    operationId: 'CL1', kind: 'local-download', phase: 'admitted-unknown', url: 'https://example.test/a', sourceEntryId: 'old-local'
  });
  candidateBulkReset(state, { importedEntries: [{ id: 'replacement', url: 'https://replacement.test/' }] });
  const before = state.sideEffectLedger.get(ledgerId);
  assert(before.supersededByReset === true, 'admitted local effect receipt survives reset marked superseded');
  assert(before.terminal === false, 'admitted local effect stays nonterminal until actual settlement');
  assert(state.journal.has('replacement'), 'replacement journal is installed');
  const settled = settleCandidateEffect(state, ledgerId, { ok: true, downloadId: 77 });
  assert(settled.mayMutateCurrentJournal === false, 'old-generation local settlement cannot mutate replacement journal');
  assert(settled.receipt.terminal === true, 'local external effect reaches durable terminal receipt');
  assert(state.journal.size === 1 && state.journal.has('replacement'), 'local settlement does not resurrect old journal entry');
}

// 7. Candidate rule: admitted/unknown remote effect survives URL-scoped clear.
{
  const state = makeState();
  seedJournalEntry(state, 'remote-source', 'https://example.test/a');
  const ledgerId = admitCandidateEffect(state, {
    operationId: 'CR1', kind: 'yandex-upload', phase: 'admitted-unknown', url: 'https://example.test/a', sourceEntryId: 'remote-source'
  });
  candidateBulkReset(state, { url: 'https://example.test/a' });
  const row = state.sideEffectLedger.get(ledgerId);
  assert(row.supersededByReset === true, 'URL clear preserves matching admitted remote receipt');
  assert(!state.journal.has('remote-source'), 'URL clear may still remove matching journal presentation');
  const settled = settleCandidateEffect(state, ledgerId, { ok: true, resourceId: 'rid-1', publicUrl: 'https://disk.example/public' });
  assert(settled.mayMutateCurrentJournal === false, 'old-generation remote settlement stays outside current journal');
  assert(settled.receipt.outcome.resourceId === 'rid-1', 'exact remote outcome remains durably reconcilable');
}

// 8. Candidate rule: destructive move needs independent pre-request receipt.
{
  const state = makeState();
  seedJournalEntry(state, 'move-source');
  const ledgerId = admitCandidateEffect(state, {
    operationId: 'CM1', kind: 'read-move', phase: 'admitted-unknown', url: 'https://example.test/a', sourceEntryId: 'move-source', targetPath: '/WebClip/Upload/move-source.pdf'
  });
  candidateBulkReset(state, { importedEntries: [{ id: 'move-source', url: 'https://replacement.test/', readingMode: 'later' }] });
  const replacementBefore = { ...state.journal.get('move-source') };
  const settled = settleCandidateEffect(state, ledgerId, { ok: true, targetPath: '/WebClip/Upload/move-source.pdf', resourceId: 'rid-move' });
  assert(settled.receipt.supersededByReset === true, 'move receipt survives replacement even with same entry id');
  assert(settled.mayMutateCurrentJournal === false, 'old move settlement has no authority over same-id replacement');
  assert(JSON.stringify(state.journal.get('move-source')) === JSON.stringify(replacementBefore), 'same-id replacement record remains byte-for-byte unchanged');
}

// 9. Ledger identity is operation/generation bound and cannot be silently reused.
{
  const state = makeState();
  const a = admitCandidateEffect(state, { operationId: 'G1', kind: 'yandex-upload', phase: 'admitted-unknown', url: 'https://a.test/' });
  candidateBulkReset(state);
  const b = admitCandidateEffect(state, { operationId: 'G2', kind: 'yandex-upload', phase: 'admitted-unknown', url: 'https://a.test/' });
  assert(a !== b, 'distinct operations have distinct receipt keys');
  assert(state.sideEffectLedger.get(a).sourceJournalGeneration === 1, 'old receipt retains source journal generation');
  assert(state.sideEffectLedger.get(b).sourceJournalGeneration === 2, 'new receipt binds to current journal generation');
  settleCandidateEffect(state, a, { ok: true, resourceId: 'old-rid' });
  const newRow = state.sideEffectLedger.get(b);
  assert(newRow.terminal === false, 'settling old receipt cannot consume newer operation receipt');
}

console.log(`PASS ${checks} checks`);
