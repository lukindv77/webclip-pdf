'use strict';

const assert = require('assert');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeState(completedVersion = 'A') {
  return {
    completedVersion,
    nextGeneration: 1,
    pending: null,
    diagnostics: []
  };
}

function unsafeBeginRefresh(state, targetVersion) {
  // Mirrors the current root cause: success marker advances before enumeration/reload.
  state.completedVersion = targetVersion;
}

function ensurePendingRefresh(state, targetVersion) {
  if (state.pending?.targetVersion === targetVersion) return state.pending;
  if (!state.pending && state.completedVersion === targetVersion) return null;
  const generation = state.nextGeneration++;
  state.pending = {
    generation,
    targetVersion,
    phase: 'pending',
    attemptCount: 0,
    targets: {},
    lastError: ''
  };
  return state.pending;
}

function recordEnumeration(state, generation, pages) {
  const pending = state.pending;
  if (!pending || pending.generation !== generation) return false;
  pending.attemptCount += 1;
  pending.phase = 'repairing';
  const live = new Set();
  for (const page of pages) {
    const key = page.documentId;
    live.add(key);
    const existing = pending.targets[key];
    pending.targets[key] = existing || {
      documentId: key,
      tabId: page.tabId,
      url: page.url,
      pageKind: page.pageKind,
      status: 'discovered',
      challenge: `g${generation}:${key}`
    };
  }
  for (const target of Object.values(pending.targets)) {
    if (!live.has(target.documentId) && target.status !== 'acked') target.status = 'gone';
  }
  return true;
}

function markReloadIssued(state, generation, documentId) {
  const pending = state.pending;
  const target = pending?.targets?.[documentId];
  if (!pending || pending.generation !== generation || !target || target.status === 'gone') return false;
  target.status = 'reload-issued';
  return true;
}

function noteAttemptFailure(state, generation, error) {
  if (!state.pending || state.pending.generation !== generation) return false;
  state.pending.phase = 'pending';
  state.pending.lastError = String(error || '').slice(0, 500);
  return true;
}

function acknowledgePage(state, ack) {
  const pending = state.pending;
  if (!pending || pending.generation !== ack.generation) return false;
  if (pending.targetVersion !== ack.version) return false;
  if (ack.protocol !== 'p1-209-v1') return false;
  const target = pending.targets[ack.documentId];
  if (!target || target.status === 'gone') return false;
  if (target.tabId !== ack.tabId) return false;
  if (target.challenge !== ack.challenge) return false;
  target.status = 'acked';
  target.pageNonce = ack.pageNonce;
  return true;
}

function canComplete(state, generation, currentPages) {
  const pending = state.pending;
  if (!pending || pending.generation !== generation) return false;
  const currentByDocument = new Map(currentPages.map((p) => [p.documentId, p]));
  for (const page of currentPages) {
    const target = pending.targets[page.documentId];
    if (!target || target.status !== 'acked') return false;
    if (target.tabId !== page.tabId || target.url !== page.url) return false;
  }
  for (const target of Object.values(pending.targets)) {
    if (target.status === 'acked') continue;
    if (target.status === 'gone' && !currentByDocument.has(target.documentId)) continue;
    return false;
  }
  return true;
}

function completeRefresh(state, generation, currentPages) {
  if (!canComplete(state, generation, currentPages)) return false;
  state.completedVersion = state.pending.targetVersion;
  state.pending.phase = 'completed';
  state.pending = null;
  return true;
}

function page(id, tabId, version = 'B', pageKind = 'options') {
  return {
    documentId: id,
    tabId,
    version,
    pageKind,
    url: `chrome-extension://webclip/${pageKind}.html`
  };
}

function ackFor(state, p, overrides = {}) {
  const target = state.pending.targets[p.documentId];
  return {
    generation: state.pending.generation,
    version: state.pending.targetVersion,
    protocol: 'p1-209-v1',
    documentId: p.documentId,
    tabId: p.tabId,
    challenge: target.challenge,
    pageNonce: `nonce:${p.documentId}`,
    ...overrides
  };
}

// 1. Current implementation can publish B before any page repair happened.
{
  const s = makeState('A');
  unsafeBeginRefresh(s, 'B');
  assert.equal(s.completedVersion, 'B');
  // Crash now: next worker has no durable distinction between admission and success.
}

// 2. Target model writes a pending generation before enumeration and does not advance completedVersion.
{
  const s = makeState('A');
  const p = ensurePendingRefresh(s, 'B');
  assert.equal(p.targetVersion, 'B');
  assert.equal(p.phase, 'pending');
  assert.equal(s.completedVersion, 'A');
}

// 3. Worker restart resumes the same durable generation rather than minting another one.
{
  const s = makeState('A');
  const first = ensurePendingRefresh(s, 'B');
  const restarted = clone(s);
  const resumed = ensurePendingRefresh(restarted, 'B');
  assert.equal(resumed.generation, first.generation);
  assert.equal(restarted.completedVersion, 'A');
}

// 4. tabs.query/enumeration failure leaves B pending and retryable.
{
  const s = makeState('A');
  const p = ensurePendingRefresh(s, 'B');
  noteAttemptFailure(s, p.generation, 'tabs.query failed');
  assert.equal(s.completedVersion, 'A');
  assert.equal(s.pending.phase, 'pending');
  assert.match(s.pending.lastError, /tabs\.query/);
}

// 5. A successful reload command is only reload-issued, never completion proof.
{
  const s = makeState('A');
  const p = ensurePendingRefresh(s, 'B');
  const old = page('doc-old', 7, 'A');
  recordEnumeration(s, p.generation, [old]);
  assert.equal(markReloadIssued(s, p.generation, old.documentId), true);
  assert.equal(s.pending.targets[old.documentId].status, 'reload-issued');
  assert.equal(s.completedVersion, 'A');
  assert.equal(completeRefresh(s, p.generation, [old]), false);
}

// 6. A reload failure of one page cannot be masked by another page succeeding.
{
  const s = makeState('A');
  const p = ensurePendingRefresh(s, 'B');
  const x = page('doc-x', 1, 'A');
  const y = page('doc-y', 2, 'A');
  recordEnumeration(s, p.generation, [x, y]);
  markReloadIssued(s, p.generation, x.documentId);
  noteAttemptFailure(s, p.generation, 'reload y rejected');
  assert.equal(s.completedVersion, 'A');
  assert(s.pending);
}

// 7. A current B page can acknowledge the exact pending generation/document/challenge.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const current = page('doc-b', 4, 'B', 'journal');
  recordEnumeration(s, pending.generation, [current]);
  const ack = ackFor(s, current);
  assert.equal(acknowledgePage(s, ack), true);
  assert.equal(s.pending.targets[current.documentId].status, 'acked');
  assert.equal(completeRefresh(s, pending.generation, [current]), true);
  assert.equal(s.completedVersion, 'B');
}

// 8. Old-document acknowledgement cannot complete the replacement document.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const old = page('doc-old', 9, 'A');
  recordEnumeration(s, pending.generation, [old]);
  const oldAck = ackFor(s, old, { version: 'A' });
  assert.equal(acknowledgePage(s, oldAck), false);
  const fresh = page('doc-new', 9, 'B');
  recordEnumeration(s, pending.generation, [fresh]);
  assert.equal(completeRefresh(s, pending.generation, [fresh]), false);
}

// 9. tabId reuse is not document identity.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const first = page('doc-1', 12, 'A');
  recordEnumeration(s, pending.generation, [first]);
  const reused = page('doc-2', 12, 'B');
  recordEnumeration(s, pending.generation, [reused]);
  assert.equal(acknowledgePage(s, {
    generation: pending.generation,
    version: 'B', protocol: 'p1-209-v1', documentId: 'doc-1', tabId: 12,
    challenge: `g${pending.generation}:doc-1`, pageNonce: 'late'
  }), false);
}

// 10. Version C supersedes unfinished B; late B acknowledgement has no authority over C.
{
  const s = makeState('A');
  const b = ensurePendingRefresh(s, 'B');
  const bPage = page('doc-b', 5, 'B');
  recordEnumeration(s, b.generation, [bPage]);
  const lateB = ackFor(s, bPage);
  const c = ensurePendingRefresh(s, 'C');
  assert.notEqual(c.generation, b.generation);
  assert.equal(acknowledgePage(s, lateB), false);
  assert.equal(s.completedVersion, 'A');
}

// 11. A newly opened extension page during pending repair must be included by fresh reconciliation.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const first = page('doc-1', 1, 'B');
  recordEnumeration(s, pending.generation, [first]);
  acknowledgePage(s, ackFor(s, first));
  const newcomer = page('doc-2', 2, 'B', 'journal');
  recordEnumeration(s, pending.generation, [first, newcomer]);
  assert.equal(completeRefresh(s, pending.generation, [first, newcomer]), false);
  acknowledgePage(s, ackFor(s, newcomer));
  assert.equal(completeRefresh(s, pending.generation, [first, newcomer]), true);
}

// 12. A disappeared target may be reconciled as gone, but only after fresh enumeration proves it absent.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const p = page('doc-x', 6, 'A');
  recordEnumeration(s, pending.generation, [p]);
  recordEnumeration(s, pending.generation, []);
  assert.equal(s.pending.targets[p.documentId].status, 'gone');
  assert.equal(completeRefresh(s, pending.generation, []), true);
}

// 13. No open extension pages can complete after a successful empty enumeration.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  recordEnumeration(s, pending.generation, []);
  assert.equal(completeRefresh(s, pending.generation, []), true);
  assert.equal(s.completedVersion, 'B');
}

// 14. Wrong generation, wrong version, wrong protocol and wrong challenge are each rejected.
{
  const variants = [
    { generation: 999 },
    { version: 'A' },
    { protocol: 'old' },
    { challenge: 'wrong' }
  ];
  for (const override of variants) {
    const s = makeState('A');
    const pending = ensurePendingRefresh(s, 'B');
    const p = page('doc-b', 3, 'B');
    recordEnumeration(s, pending.generation, [p]);
    assert.equal(acknowledgePage(s, ackFor(s, p, override)), false);
  }
}

// 15. Acknowledgement from one current page does not cover another page.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const x = page('doc-x', 1, 'B');
  const y = page('doc-y', 2, 'B');
  recordEnumeration(s, pending.generation, [x, y]);
  acknowledgePage(s, ackFor(s, x));
  assert.equal(completeRefresh(s, pending.generation, [x, y]), false);
}

// 16. Completed B with no pending work is idempotent on later worker wakes.
{
  const s = makeState('B');
  assert.equal(ensurePendingRefresh(s, 'B'), null);
  assert.equal(s.pending, null);
}

// 17. Retry diagnostics are bounded state, not proof of success.
{
  const s = makeState('A');
  const p = ensurePendingRefresh(s, 'B');
  for (let i = 0; i < 4; i += 1) {
    recordEnumeration(s, p.generation, []);
    noteAttemptFailure(s, p.generation, `failure-${i}`);
  }
  assert.equal(s.pending.attemptCount, 4);
  assert.equal(s.completedVersion, 'A');
}

// 18. Completion is impossible while a current target is merely reload-issued.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const p = page('doc-b', 8, 'B');
  recordEnumeration(s, pending.generation, [p]);
  markReloadIssued(s, pending.generation, p.documentId);
  assert.equal(canComplete(s, pending.generation, [p]), false);
}

// 19. Page nonce alone is not enough; durable generation + browser document identity remain mandatory.
{
  const s = makeState('A');
  const pending = ensurePendingRefresh(s, 'B');
  const p = page('doc-b', 8, 'B');
  recordEnumeration(s, pending.generation, [p]);
  assert.equal(acknowledgePage(s, ackFor(s, p, { documentId: 'other-doc', pageNonce: 'same-nonce' })), false);
}

// 20. The model keeps pending and completed as distinct durable meanings.
{
  const s = makeState('A');
  ensurePendingRefresh(s, 'B');
  assert.equal(Boolean(s.pending), true);
  assert.equal(s.completedVersion === 'B', false);
}

console.log('P1-209 extension page version refresh model: PASS');
