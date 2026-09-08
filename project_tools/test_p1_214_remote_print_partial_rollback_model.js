'use strict';

const assert = require('assert');

// P1-214 deterministic architecture model.
// This model deliberately separates command transport settlement from the
// child document's actual mutable print state.

class ChildFrame {
  constructor(frameId, documentId) {
    this.frameId = frameId;
    this.documentId = documentId;
    this.active = null;
    this.closed = new Set();
    this.prepareCalls = [];
    this.restoreCalls = [];
  }

  prepare(generation, mode = 'success') {
    this.prepareCalls.push(generation);
    if (this.closed.has(generation)) return { ok: false, clean: true, code: 'closed-generation' };
    if (this.active && this.active.generation !== generation) {
      return { ok: false, clean: false, code: 'cleanup-required' };
    }
    if (!this.active) {
      this.active = { generation, style: true, attrs: true };
    }
    if (mode === 'fail-clean') {
      this.active = null;
      this.closed.add(generation);
      return { ok: false, clean: true, code: 'failed-clean' };
    }
    if (mode === 'fail-dirty') {
      return { ok: false, clean: false, code: 'failed-dirty' };
    }
    return {
      ok: true,
      prepared: true,
      receipt: { frameId: this.frameId, documentId: this.documentId, printGeneration: generation }
    };
  }

  restore(generation, mode = 'success') {
    this.restoreCalls.push(generation);
    if (this.active?.generation === generation) {
      if (mode === 'not-delivered') return { delivered: false };
      this.active = null;
      this.closed.add(generation);
      return { ok: true, clean: true, generation };
    }
    if (!this.active) {
      this.closed.add(generation);
      return { ok: true, clean: true, generation, alreadyClean: true };
    }
    // Another generation is current. Under P1-199 this can only happen if the
    // older generation is already closed; stale restore must never mutate B.
    if (this.closed.has(generation)) {
      return { ok: true, clean: true, generation, stale: true };
    }
    return { ok: false, clean: false, code: 'different-active-generation' };
  }

  query(generation) {
    if (this.active?.generation === generation) return { state: 'active', generation };
    if (this.closed.has(generation)) return { state: 'clean', generation };
    return { state: 'not-seen', generation };
  }

  replaceDocument(newDocumentId) {
    this.documentId = newDocumentId;
    this.active = null;
    this.closed.clear();
  }
}

function receiptFor(child, generation) {
  return {
    frameId: child.frameId,
    documentId: child.documentId,
    printGeneration: generation,
    prepareState: 'not-issued',
    restoreState: 'not-needed',
    lastError: ''
  };
}

class Saga {
  constructor(generation) {
    this.generation = generation;
    this.receipts = new Map();
    this.terminal = false;
  }

  key(frameId, documentId) {
    return `${frameId}:${documentId}`;
  }

  track(child) {
    const key = this.key(child.frameId, child.documentId);
    if (!this.receipts.has(key)) this.receipts.set(key, receiptFor(child, this.generation));
    return this.receipts.get(key);
  }

  issuePrepare(child, transport = 'success', childMode = 'success') {
    const r = this.track(child);
    // The receipt exists before transport is attempted. A lost response can no
    // longer erase knowledge that generation G may have reached this child.
    r.prepareState = 'issued-unknown';
    const actual = child.prepare(this.generation, childMode);

    if (transport === 'not-delivered') {
      // Model an outer failure before the child actually receives the command.
      if (actual.ok || actual.clean === false) {
        // Roll back the model's synthetic delivery because this transport mode
        // says the child never received it.
        if (child.active?.generation === this.generation) child.active = null;
        child.prepareCalls.pop();
      }
      r.lastError = 'transport-not-delivered';
      return { ok: false, unknown: true };
    }

    if (transport === 'response-lost') {
      r.lastError = 'prepare-response-lost';
      return { ok: false, unknown: true };
    }

    if (actual.ok) {
      r.prepareState = 'prepared';
      r.restoreState = 'pending';
      return { ok: true };
    }
    if (actual.clean) {
      r.prepareState = 'failed-clean';
      r.restoreState = 'not-needed';
      r.lastError = actual.code || 'failed-clean';
      return { ok: false, clean: true };
    }
    r.prepareState = 'issued-unknown';
    r.restoreState = 'pending';
    r.lastError = actual.code || 'prepare-unknown';
    return { ok: false, unknown: true };
  }

  cleanup(child, transport = 'success') {
    const key = this.key(child.frameId, child.documentId);
    const r = this.receipts.get(key);
    if (!r) return { skipped: true };
    if (r.documentId !== child.documentId) {
      r.restoreState = 'document-gone';
      return { ok: true, documentGone: true };
    }
    if (r.prepareState === 'failed-clean' || r.prepareState === 'not-issued') {
      r.restoreState = 'not-needed';
      return { ok: true, clean: true };
    }

    r.restoreState = 'issued-unknown';
    if (transport === 'not-delivered') {
      r.lastError = 'restore-not-delivered';
      return { ok: false, unknown: true };
    }

    const actual = child.restore(this.generation);
    if (transport === 'response-lost') {
      r.lastError = 'restore-response-lost';
      return { ok: false, unknown: true };
    }
    if (actual.ok && actual.clean) {
      r.restoreState = 'restored';
      r.lastError = '';
      return { ok: true, clean: true };
    }
    r.lastError = actual.code || 'restore-unknown';
    return { ok: false, unknown: true };
  }

  reconcile(child) {
    const key = this.key(child.frameId, child.documentId);
    const r = this.receipts.get(key);
    if (!r) return { skipped: true };
    if (r.documentId !== child.documentId) {
      r.restoreState = 'document-gone';
      return { ok: true, documentGone: true };
    }
    const state = child.query(this.generation);
    if (state.state === 'clean' || state.state === 'not-seen') {
      r.restoreState = 'restored';
      return { ok: true, clean: true };
    }
    return { ok: false, active: true };
  }

  unresolved() {
    return [...this.receipts.values()].filter((r) =>
      (r.prepareState === 'prepared' || r.prepareState === 'issued-unknown') &&
      !['restored', 'document-gone'].includes(r.restoreState));
  }

  canStartNewPrintFor(child) {
    const key = this.key(child.frameId, child.documentId);
    const r = this.receipts.get(key);
    if (!r) return true;
    return !this.unresolved().includes(r);
  }
}

// Current-shaped buggy coordinator: prepare receipts are only registered after
// the whole fail-closed fanout returns.
function currentPrepareFanout(childrenAndModes) {
  const preparedSet = new Set();
  const responses = [];
  for (const [child, mode] of childrenAndModes) {
    const response = child.prepare('CURRENT', mode);
    if (!response.ok) throw Object.assign(new Error('prepare failed'), { preparedSet });
    responses.push([child, response]);
  }
  for (const [child] of responses) preparedSet.add(child.frameId);
  return preparedSet;
}

// Current-shaped restore: ownership is cleared before actual settlement.
function currentRestore(preparedSet, child, transport) {
  const ids = [...preparedSet];
  preparedSet.clear();
  if (!ids.includes(child.frameId)) return;
  if (transport === 'not-delivered') return;
  child.restore('CURRENT');
  // response loss is swallowed and receipt is already gone.
}

// 1. Current partial-success bug: A mutates, B fails, A is never tracked.
{
  const a = new ChildFrame(1, 'doc-a');
  const b = new ChildFrame(2, 'doc-b');
  let thrown;
  try { currentPrepareFanout([[a, 'success'], [b, 'fail-clean']]); } catch (error) { thrown = error; }
  assert.ok(thrown);
  assert.equal(a.query('CURRENT').state, 'active');
  assert.equal(thrown.preparedSet.size, 0);
}

// 2. Target: A succeeds, B fails clean -> A remains tracked and is compensated.
{
  const a = new ChildFrame(1, 'doc-a');
  const b = new ChildFrame(2, 'doc-b');
  const saga = new Saga('G1');
  assert.equal(saga.issuePrepare(a).ok, true);
  assert.equal(saga.issuePrepare(b, 'success', 'fail-clean').ok, false);
  assert.equal(saga.unresolved().length, 1);
  assert.equal(saga.cleanup(a).ok, true);
  assert.equal(a.query('G1').state, 'clean');
  assert.equal(saga.unresolved().length, 0);
}

// 3. A/B succeed, C fails -> both successful children are compensated.
{
  const a = new ChildFrame(1, 'a');
  const b = new ChildFrame(2, 'b');
  const c = new ChildFrame(3, 'c');
  const saga = new Saga('G2');
  saga.issuePrepare(a);
  saga.issuePrepare(b);
  saga.issuePrepare(c, 'success', 'fail-clean');
  assert.equal(saga.unresolved().length, 2);
  saga.cleanup(b);
  saga.cleanup(a);
  assert.equal(a.query('G2').state, 'clean');
  assert.equal(b.query('G2').state, 'clean');
  assert.equal(saga.unresolved().length, 0);
}

// 4. First child fails clean -> no unnecessary rollback debt.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G3');
  const result = saga.issuePrepare(a, 'success', 'fail-clean');
  assert.equal(result.clean, true);
  assert.equal(saga.unresolved().length, 0);
  assert.equal(a.restoreCalls.length, 0);
}

// 5. Prepare response lost after child mutated -> parent retains issued-unknown.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G4');
  const result = saga.issuePrepare(a, 'response-lost');
  assert.equal(result.unknown, true);
  assert.equal(a.query('G4').state, 'active');
  assert.equal(saga.unresolved().length, 1);
  assert.equal(saga.cleanup(a).ok, true);
  assert.equal(a.query('G4').state, 'clean');
}

// 6. Prepare never delivered -> the same generation receipt can reconcile clean.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G5');
  saga.issuePrepare(a, 'not-delivered');
  assert.equal(saga.unresolved().length, 1);
  assert.equal(saga.reconcile(a).clean, true);
  assert.equal(saga.unresolved().length, 0);
}

// 7. Child fails dirty during prepare -> error is not misclassified as clean.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G6');
  const result = saga.issuePrepare(a, 'success', 'fail-dirty');
  assert.equal(result.unknown, true);
  assert.equal(a.query('G6').state, 'active');
  assert.equal(saga.cleanup(a).ok, true);
}

// 8. Current restore loses ownership before settlement.
{
  const a = new ChildFrame(1, 'a');
  a.prepare('CURRENT');
  const set = new Set([1]);
  currentRestore(set, a, 'not-delivered');
  assert.equal(set.size, 0);
  assert.equal(a.query('CURRENT').state, 'active');
}

// 9. Target restore not delivered -> receipt remains restore-unknown.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G7');
  saga.issuePrepare(a);
  const result = saga.cleanup(a, 'not-delivered');
  assert.equal(result.unknown, true);
  assert.equal(saga.unresolved().length, 1);
  assert.equal(a.query('G7').state, 'active');
}

// 10. Restore applied but response lost -> query retires exact debt without replaying B.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G8');
  saga.issuePrepare(a);
  const result = saga.cleanup(a, 'response-lost');
  assert.equal(result.unknown, true);
  assert.equal(a.query('G8').state, 'clean');
  assert.equal(saga.unresolved().length, 1);
  assert.equal(saga.reconcile(a).clean, true);
  assert.equal(saga.unresolved().length, 0);
}

// 11. One sibling restore can settle while another remains unknown.
{
  const a = new ChildFrame(1, 'a');
  const b = new ChildFrame(2, 'b');
  const saga = new Saga('G9');
  saga.issuePrepare(a); saga.issuePrepare(b);
  saga.cleanup(a);
  saga.cleanup(b, 'not-delivered');
  assert.equal(saga.unresolved().length, 1);
  assert.equal(saga.unresolved()[0].frameId, 2);
}

// 12. New prepare in the same child is blocked while old rollback debt is unknown.
{
  const a = new ChildFrame(1, 'a');
  const oldSaga = new Saga('G10');
  oldSaga.issuePrepare(a);
  oldSaga.cleanup(a, 'not-delivered');
  assert.equal(oldSaga.canStartNewPrintFor(a), false);
  const attempted = a.prepare('G11');
  assert.equal(attempted.ok, false);
  assert.equal(attempted.code, 'cleanup-required');
}

// 13. After exact old cleanup, newer generation may prepare normally.
{
  const a = new ChildFrame(1, 'a');
  const oldSaga = new Saga('G12');
  oldSaga.issuePrepare(a);
  oldSaga.cleanup(a);
  assert.equal(oldSaga.canStartNewPrintFor(a), true);
  const newer = a.prepare('G13');
  assert.equal(newer.ok, true);
}

// 14. Stale restore A cannot undo B after A is closed (P1-199 composition).
{
  const a = new ChildFrame(1, 'a');
  a.prepare(14);
  a.restore(14);
  a.prepare(15);
  const stale = a.restore(14);
  assert.equal(stale.ok, true);
  assert.equal(stale.stale, true);
  assert.equal(a.query(15).state, 'active');
}

// 15. Same frameId with a replacement document cannot consume old receipt.
{
  const a = new ChildFrame(7, 'old-doc');
  const saga = new Saga('G16');
  saga.issuePrepare(a);
  const oldReceipt = [...saga.receipts.values()][0];
  a.replaceDocument('new-doc');
  assert.notEqual(oldReceipt.documentId, a.documentId);
  // Old receipt must be retired as document-gone by exact document reconciliation,
  // never sent to the replacement document.
  oldReceipt.restoreState = 'document-gone';
  assert.equal(saga.unresolved().length, 0);
}

// 16. Retry of same prepare generation is idempotent and does not stack styles.
{
  const a = new ChildFrame(1, 'a');
  const first = a.prepare('G17');
  const second = a.prepare('G17');
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(a.active.generation, 'G17');
}

// 17. Coordinator restart preserves rollback debt when receipts are serialized.
{
  const a = new ChildFrame(1, 'a');
  const saga = new Saga('G18');
  saga.issuePrepare(a);
  saga.cleanup(a, 'not-delivered');
  const persisted = JSON.parse(JSON.stringify([...saga.receipts.entries()]));
  const resumed = new Saga('G18');
  resumed.receipts = new Map(persisted);
  assert.equal(resumed.unresolved().length, 1);
  assert.equal(resumed.cleanup(a).ok, true);
  assert.equal(resumed.unresolved().length, 0);
}

// 18. Aggregate error never discards already-known per-child receipts.
{
  const a = new ChildFrame(1, 'a');
  const b = new ChildFrame(2, 'b');
  const saga = new Saga('G19');
  const results = [saga.issuePrepare(a), saga.issuePrepare(b, 'response-lost')];
  assert.equal(results.some((r) => !r.ok), true);
  assert.equal(saga.receipts.size, 2);
  assert.equal(saga.unresolved().length, 2);
}

// 19. Cleanup attempts every prepared child; one failure does not stop siblings.
{
  const a = new ChildFrame(1, 'a');
  const b = new ChildFrame(2, 'b');
  const c = new ChildFrame(3, 'c');
  const saga = new Saga('G20');
  saga.issuePrepare(a); saga.issuePrepare(b); saga.issuePrepare(c);
  saga.cleanup(a);
  saga.cleanup(b, 'not-delivered');
  saga.cleanup(c);
  assert.equal(a.query('G20').state, 'clean');
  assert.equal(c.query('G20').state, 'clean');
  assert.equal(saga.unresolved().length, 1);
  assert.equal(saga.unresolved()[0].frameId, 2);
}

// 20. Receipt identity is exact child document + frame + print generation.
{
  const a = new ChildFrame(9, 'doc-9');
  const saga = new Saga('G21');
  saga.issuePrepare(a);
  const r = [...saga.receipts.values()][0];
  assert.deepEqual(
    { frameId: r.frameId, documentId: r.documentId, printGeneration: r.printGeneration },
    { frameId: 9, documentId: 'doc-9', printGeneration: 'G21' }
  );
}

console.log('P1-214 remote print partial rollback model: PASS');
