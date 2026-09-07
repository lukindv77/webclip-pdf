'use strict';

const assert = require('assert');

function makeWorker() {
  return { incarnation: `worker-${Math.random()}`, pending: new Map(), active: new Map() };
}

function key(tabId = 1, frameId = 2) { return `${tabId}:${frameId}`; }

function begin(worker, childDocumentId = 'child-A', agentInstanceId = 'agent-A') {
  const handshakeId = `h-${Math.random()}`;
  worker.pending.set(key(), {
    handshakeId,
    workerIncarnation: worker.incarnation,
    childDocumentId,
    agentInstanceId
  });
  return handshakeId;
}

function settle(worker, receipt, { clean = () => {}, bind = () => {} } = {}) {
  const current = worker.pending.get(key()) || null;
  const exact = Boolean(
    current
    && current.handshakeId === receipt.handshakeId
    && current.workerIncarnation === worker.incarnation
    && receipt.workerIncarnation === worker.incarnation
    && current.childDocumentId === receipt.childDocumentId
    && current.agentInstanceId === receipt.agentInstanceId
  );

  // Core P1-203 invariant: a stale response has no cleanup/delete authority
  // over a newer pending handshake.
  if (!exact) return { stale: true, bound: false, cleaned: false };

  worker.pending.delete(key());
  if (!receipt.continuityAccepted) {
    clean();
    worker.active.delete(key());
    return { stale: false, bound: false, cleaned: true };
  }

  const bindingId = `binding-${Math.random()}`;
  worker.active.set(key(), {
    bindingId,
    workerIncarnation: worker.incarnation,
    childDocumentId: receipt.childDocumentId,
    agentInstanceId: receipt.agentInstanceId
  });
  bind(bindingId);
  return { stale: false, bound: true, cleaned: false, bindingId };
}

function receipt(worker, handshakeId, accepted = true) {
  return {
    handshakeId,
    workerIncarnation: worker.incarnation,
    childDocumentId: 'child-A',
    agentInstanceId: 'agent-A',
    continuityAccepted: accepted
  };
}

// 1. A current successful handshake issues one active binding.
{
  const worker = makeWorker();
  const h = begin(worker);
  const result = settle(worker, receipt(worker, h, true));
  assert.equal(result.bound, true);
  assert.equal(worker.pending.size, 0);
  assert.equal(worker.active.size, 1);
}

// 2. A current failed continuity decision may clean exactly its own attempt.
{
  const worker = makeWorker();
  const h = begin(worker);
  let cleaned = 0;
  const result = settle(worker, receipt(worker, h, false), { clean: () => { cleaned += 1; } });
  assert.equal(result.cleaned, true);
  assert.equal(cleaned, 1);
  assert.equal(worker.pending.size, 0);
}

// 3. H2 supersedes H1; late successful H1 cannot consume H2.
{
  const worker = makeWorker();
  const h1 = begin(worker);
  const h2 = begin(worker);
  const lateH1 = settle(worker, receipt(worker, h1, true));
  assert.equal(lateH1.stale, true);
  assert.equal(worker.pending.get(key()).handshakeId, h2);
  assert.equal(worker.active.size, 0);
}

// 4. H2 supersedes H1; late failed H1 has no cleanup authority over H2.
{
  const worker = makeWorker();
  const h1 = begin(worker);
  const h2 = begin(worker);
  let cleaned = 0;
  const lateH1 = settle(worker, receipt(worker, h1, false), { clean: () => { cleaned += 1; } });
  assert.equal(lateH1.stale, true);
  assert.equal(cleaned, 0);
  assert.equal(worker.pending.get(key()).handshakeId, h2);
}

// 5. After stale H1 no-op, H2 can still bind normally.
{
  const worker = makeWorker();
  const h1 = begin(worker);
  const h2 = begin(worker);
  settle(worker, receipt(worker, h1, true));
  const current = settle(worker, receipt(worker, h2, true));
  assert.equal(current.bound, true);
  assert.equal(worker.active.get(key()).bindingId, current.bindingId);
}

// 6. Receipt from worker A is stale under worker B even if textual handshake id is reused.
{
  const workerA = makeWorker();
  const hA = begin(workerA);
  const old = receipt(workerA, hA, true);
  const workerB = makeWorker();
  workerB.pending.set(key(), {
    handshakeId: hA,
    workerIncarnation: workerB.incarnation,
    childDocumentId: 'child-A',
    agentInstanceId: 'agent-A'
  });
  assert.equal(settle(workerB, old).stale, true);
  assert.equal(workerB.pending.size, 1);
}

// 7. Replacement child document cannot consume the old child's handshake.
{
  const worker = makeWorker();
  const h = begin(worker, 'child-B', 'agent-B');
  const oldChildReceipt = {
    handshakeId: h,
    workerIncarnation: worker.incarnation,
    childDocumentId: 'child-A',
    agentInstanceId: 'agent-A',
    continuityAccepted: true
  };
  assert.equal(settle(worker, oldChildReceipt).stale, true);
  assert.equal(worker.pending.size, 1);
}

// 8. Binding identity is created only after current-handshake settlement.
{
  const worker = makeWorker();
  const h = begin(worker);
  assert.equal(worker.active.size, 0);
  const result = settle(worker, receipt(worker, h, true));
  assert.equal(Boolean(result.bindingId), true);
  assert.equal(worker.active.size, 1);
}

console.log('P1-203 frame-agent handshake CAS model: PASS');
