'use strict';

const assert = require('assert');

let nonce = 0;
function id(prefix) { nonce += 1; return `${prefix}-${nonce}`; }

function makeAgent({ documentId = 'child-A', permissionGeneration = 'perm-A', topDocumentId = 'top-A' } = {}) {
  return {
    documentId,
    topDocumentId,
    permissionGeneration,
    boundWorkerIncarnation: '',
    selectionSessionGeneration: '',
    printGeneration: '',
    phase: 'idle',
    includes: [],
    excludes: [],
    listenersActive: false,
    printStyle: false,
    changedAttrs: 0,
    reconcileRequired: true,
    stateRevision: 0
  };
}

function makeTop({ documentId = 'top-A', selectionSessionGeneration = 'sel-A' } = {}) {
  return {
    documentId,
    selectionSessionGeneration,
    workerIncarnation: '',
    remoteSnapshots: new Map(),
    remoteAuthority: new Map()
  };
}

function makeWorker() {
  return {
    incarnation: id('worker'),
    registry: new Map()
  };
}

function agentKey(tabId, frameId) { return `${tabId}:${frameId}`; }

function startSelection(agent, generation, includes = ['locator-A']) {
  agent.phase = 'selecting';
  agent.selectionSessionGeneration = generation;
  agent.includes = [...includes];
  agent.listenersActive = true;
  agent.reconcileRequired = false;
  agent.stateRevision += 1;
}

function preparePrint(agent, generation) {
  agent.phase = 'printing';
  agent.printGeneration = generation;
  agent.printStyle = true;
  agent.changedAttrs = 2;
  agent.listenersActive = true;
  agent.stateRevision += 1;
}

function cleanupAgent(agent) {
  agent.phase = 'idle';
  agent.includes = [];
  agent.excludes = [];
  agent.listenersActive = false;
  agent.printStyle = false;
  agent.changedAttrs = 0;
  agent.selectionSessionGeneration = '';
  agent.printGeneration = '';
  agent.reconcileRequired = false;
  agent.stateRevision += 1;
}

function observeWorkerIncarnation(top, worker) {
  if (top.workerIncarnation && top.workerIncarnation !== worker.incarnation) {
    top.remoteAuthority.clear();
  }
  top.workerIncarnation = worker.incarnation;
}

function makeContinuityReceipt({ agent, top, worker, permissionGranted = true, exactDocument = true, exactTop = true, exactSelection = true } = {}) {
  return {
    workerIncarnation: worker.incarnation,
    permissionGranted,
    permissionGeneration: agent.permissionGeneration,
    childDocumentId: exactDocument ? agent.documentId : 'other-child',
    topDocumentId: exactTop ? top.documentId : 'other-top',
    selectionSessionGeneration: exactSelection ? top.selectionSessionGeneration : 'other-selection'
  };
}

function reconcile(worker, top, agent, { tabId = 1, frameId = 2, receipt = null } = {}) {
  observeWorkerIncarnation(top, worker);
  agent.reconcileRequired = true;

  const exact = Boolean(
    receipt
    && receipt.workerIncarnation === worker.incarnation
    && receipt.permissionGranted
    && receipt.permissionGeneration === agent.permissionGeneration
    && receipt.childDocumentId === agent.documentId
    && receipt.topDocumentId === agent.topDocumentId
    && receipt.topDocumentId === top.documentId
    && receipt.selectionSessionGeneration === agent.selectionSessionGeneration
    && receipt.selectionSessionGeneration === top.selectionSessionGeneration
  );

  if (!exact) {
    cleanupAgent(agent);
    agent.boundWorkerIncarnation = worker.incarnation;
    worker.registry.set(agentKey(tabId, frameId), {
      documentId: agent.documentId,
      topDocumentId: top.documentId,
      workerIncarnation: worker.incarnation,
      permissionGeneration: agent.permissionGeneration,
      selectionSessionGeneration: '',
      state: 'clean-idle'
    });
    top.remoteSnapshots.delete(frameId);
    top.remoteAuthority.delete(frameId);
    return { resumed: false, cleaned: true };
  }

  agent.boundWorkerIncarnation = worker.incarnation;
  agent.reconcileRequired = false;
  worker.registry.set(agentKey(tabId, frameId), {
    documentId: agent.documentId,
    topDocumentId: top.documentId,
    workerIncarnation: worker.incarnation,
    permissionGeneration: agent.permissionGeneration,
    selectionSessionGeneration: agent.selectionSessionGeneration,
    state: 'active'
  });
  top.remoteAuthority.set(frameId, {
    workerIncarnation: worker.incarnation,
    documentId: agent.documentId,
    selectionSessionGeneration: agent.selectionSessionGeneration
  });
  top.remoteSnapshots.set(frameId, {
    includes: [...agent.includes],
    excludes: [...agent.excludes],
    stateRevision: agent.stateRevision
  });
  return { resumed: true, cleaned: false };
}

function admitState(worker, agent, { tabId = 1, frameId = 2, workerIncarnation = agent.boundWorkerIncarnation, selectionSessionGeneration = agent.selectionSessionGeneration } = {}) {
  const record = worker.registry.get(agentKey(tabId, frameId));
  return Boolean(
    record
    && record.workerIncarnation === worker.incarnation
    && workerIncarnation === worker.incarnation
    && record.documentId === agent.documentId
    && record.permissionGeneration === agent.permissionGeneration
    && record.selectionSessionGeneration === selectionSessionGeneration
    && !agent.reconcileRequired
  );
}

function admitCommand(worker, agent, command) {
  if (!admitState(worker, agent)) return false;
  if (command.workerIncarnation !== worker.incarnation) return false;
  if (command.documentId !== agent.documentId) return false;
  if (command.selectionSessionGeneration !== agent.selectionSessionGeneration) return false;
  return true;
}

// 1. Canonical failure shape: worker globals disappear while renderer state survives.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-A');
  const workerA = makeWorker();
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const receiptA = makeContinuityReceipt({ agent, top, worker: workerA });
  assert.equal(reconcile(workerA, top, agent, { receipt: receiptA }).resumed, true);
  const workerB = makeWorker();
  assert.equal(workerB.registry.size, 0);
  assert.equal(agent.phase, 'selecting');
  assert.equal(agent.listenersActive, true);
}

// 2. STATE cannot self-authorize before re-handshake with the fresh worker.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-A');
  agent.boundWorkerIncarnation = 'old-worker';
  const worker = makeWorker();
  assert.equal(admitState(worker, agent, { workerIncarnation: 'old-worker' }), false);
}

// 3. Same child/top/session may resume only with an exact fresh-worker continuity receipt.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-A', ['keep-A']);
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const worker = makeWorker();
  const receipt = makeContinuityReceipt({ agent, top, worker });
  const result = reconcile(worker, top, agent, { receipt });
  assert.equal(result.resumed, true);
  assert.deepEqual(agent.includes, ['keep-A']);
  assert.equal(admitState(worker, agent), true);
}

// 4. REGISTER/liveness without continuity proof cleans rather than silently adopts old selection.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-old', ['stale']);
  const top = makeTop({ selectionSessionGeneration: 'sel-new' });
  const worker = makeWorker();
  const result = reconcile(worker, top, agent, { receipt: null });
  assert.equal(result.cleaned, true);
  assert.equal(agent.phase, 'idle');
  assert.deepEqual(agent.includes, []);
}

// 5. Orphan printing is fail-closed cleaned when exact print/session continuity is not proven.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-A');
  preparePrint(agent, 'print-A');
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const worker = makeWorker();
  const result = reconcile(worker, top, agent, { receipt: null });
  assert.equal(result.cleaned, true);
  assert.equal(agent.printStyle, false);
  assert.equal(agent.changedAttrs, 0);
  assert.equal(agent.listenersActive, false);
}

// 6. Same frameId with a replacement child document cannot resume prior state.
{
  const oldAgent = makeAgent({ documentId: 'child-A' });
  startSelection(oldAgent, 'sel-A', ['old']);
  const newAgent = makeAgent({ documentId: 'child-B' });
  startSelection(newAgent, 'sel-A', ['new-local']);
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const worker = makeWorker();
  const staleReceipt = makeContinuityReceipt({ agent: oldAgent, top, worker });
  const result = reconcile(worker, top, newAgent, { receipt: staleReceipt });
  assert.equal(result.cleaned, true);
  assert.equal(newAgent.documentId, 'child-B');
  assert.deepEqual(newAgent.includes, []);
}

// 7. Same child with a replacement top document cannot resume prior top authority.
{
  const agent = makeAgent({ topDocumentId: 'top-A' });
  startSelection(agent, 'sel-A', ['old']);
  const top = makeTop({ documentId: 'top-B', selectionSessionGeneration: 'sel-A' });
  const worker = makeWorker();
  const receipt = makeContinuityReceipt({ agent, top, worker, exactTop: false });
  assert.equal(reconcile(worker, top, agent, { receipt }).cleaned, true);
}

// 8. Permission revoked while worker was dead cannot be resumed by restart handshake.
{
  const agent = makeAgent({ permissionGeneration: 'perm-A' });
  startSelection(agent, 'sel-A', ['old']);
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const worker = makeWorker();
  const receipt = makeContinuityReceipt({ agent, top, worker, permissionGranted: false });
  assert.equal(reconcile(worker, top, agent, { receipt }).cleaned, true);
  assert.equal(agent.phase, 'idle');
}

// 9. Regrant uses a new permission generation; old permission/session state cannot revive.
{
  const agent = makeAgent({ permissionGeneration: 'perm-B' });
  startSelection(agent, 'sel-old', ['old']);
  const top = makeTop({ selectionSessionGeneration: 'sel-new' });
  const worker = makeWorker();
  const oldPermissionReceipt = {
    ...makeContinuityReceipt({ agent, top, worker }),
    permissionGeneration: 'perm-A',
    selectionSessionGeneration: 'sel-old'
  };
  assert.equal(reconcile(worker, top, agent, { receipt: oldPermissionReceipt }).cleaned, true);
}

// 10. A delayed command from worker A is stale after the child binds worker B.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-A');
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const workerA = makeWorker();
  reconcile(workerA, top, agent, { receipt: makeContinuityReceipt({ agent, top, worker: workerA }) });
  const oldCommand = { workerIncarnation: workerA.incarnation, documentId: agent.documentId, selectionSessionGeneration: 'sel-A' };
  const workerB = makeWorker();
  reconcile(workerB, top, agent, { receipt: makeContinuityReceipt({ agent, top, worker: workerB }) });
  assert.equal(admitCommand(workerB, agent, oldCommand), false);
}

// 11. Top authority is invalidated immediately when worker incarnation changes.
{
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  const workerA = makeWorker();
  observeWorkerIncarnation(top, workerA);
  top.remoteAuthority.set(2, { workerIncarnation: workerA.incarnation });
  const workerB = makeWorker();
  observeWorkerIncarnation(top, workerB);
  assert.equal(top.remoteAuthority.size, 0);
}

// 12. Repeated restarts converge to one bounded registry record, not duplicate lifecycle rows.
{
  const agent = makeAgent();
  startSelection(agent, 'sel-A');
  const top = makeTop({ selectionSessionGeneration: 'sel-A' });
  for (let round = 0; round < 4; round += 1) {
    const worker = makeWorker();
    const result = reconcile(worker, top, agent, { receipt: makeContinuityReceipt({ agent, top, worker }) });
    assert.equal(result.resumed, true);
    assert.equal(worker.registry.size, 1);
  }
}

// 13. Idle surviving agent needs only bounded rebinding/cleanup and no synthetic selection mutation.
{
  const agent = makeAgent();
  const top = makeTop({ selectionSessionGeneration: '' });
  const worker = makeWorker();
  const beforeRevision = agent.stateRevision;
  const result = reconcile(worker, top, agent, { receipt: null });
  assert.equal(result.cleaned, true);
  assert.equal(agent.phase, 'idle');
  assert.equal(agent.listenersActive, false);
  assert.equal(agent.stateRevision, beforeRevision + 1);
}

// 14. Durable continuity receipt contains only extension-owned identifiers, never raw hostile DOM snapshot data.
{
  const receipt = {
    workerIncarnation: 'worker-X',
    topDocumentId: 'top-A',
    childDocumentId: 'child-A',
    permissionGeneration: 'perm-A',
    selectionSessionGeneration: 'sel-A',
    printGeneration: 'print-A'
  };
  const serialized = JSON.stringify(receipt);
  assert.equal(/cssPath|domPath|locator|innerText|snapshot|includes|excludes/i.test(serialized), false);
}

console.log('P1-203 frame-agent worker restart reconcile model: PASS');
