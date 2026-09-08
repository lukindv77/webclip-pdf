'use strict';

const assert = require('assert');

class FrameNode {
  constructor(id, { sameOrigin = true, docId = null, children = [] } = {}) {
    this.id = id;
    this.sameOrigin = sameOrigin;
    this.docId = docId || `doc:${id}`;
    this.children = [...children];
    this.connected = true;
  }
}

class LiveFrameTopologyModel {
  constructor({ batchBudget = 3 } = {}) {
    this.batchBudget = batchBudget;
    this.sessionGeneration = 0;
    this.active = false;
    this.knownFrames = new Map();
    this.knownDocs = new Set(['top']);
    this.listenerDocs = new Set(['top']);
    this.loadHandlers = new Set();
    this.pendingRoots = [];
    this.pendingRootIds = new Set();
    this.pendingCleanup = false;
    this.scheduled = [];
    this.scheduleCount = 0;
  }

  start(initialFrames = []) {
    this.stop();
    this.sessionGeneration += 1;
    this.active = true;
    this.knownDocs.add('top');
    this.listenerDocs.add('top');
    for (const frame of initialFrames) this._discoverImmediate(frame);
    return this.sessionGeneration;
  }

  stop() {
    if (this.active || this.knownFrames.size || this.scheduled.length) this.sessionGeneration += 1;
    this.active = false;
    this.knownFrames.clear();
    this.knownDocs = new Set(['top']);
    this.listenerDocs = new Set(['top']);
    this.loadHandlers.clear();
    this.pendingRoots = [];
    this.pendingRootIds.clear();
    this.pendingCleanup = false;
    // Deliberately keep scheduled tasks: their captured generation must make them stale.
  }

  _discoverImmediate(frame) {
    if (!this.active || !frame?.connected) return;
    this.loadHandlers.add(frame.id);
    this.knownFrames.set(frame.id, frame);
    if (!frame.sameOrigin) return;
    this.knownDocs.add(frame.docId);
    this.listenerDocs.add(frame.docId);
    for (const child of frame.children) this._discoverImmediate(child);
  }

  onTopologyMutation({ added = [], removed = [] } = {}) {
    if (!this.active) return;
    for (const frame of added) {
      if (!frame?.id || this.pendingRootIds.has(frame.id)) continue;
      this.pendingRootIds.add(frame.id);
      this.pendingRoots.push(frame);
    }
    if (removed.length) this.pendingCleanup = true;
    this._ensureScheduled();
  }

  _ensureScheduled() {
    if (!this.active) return;
    const generation = this.sessionGeneration;
    if (this.scheduled.some((task) => task.generation === generation && !task.done)) return;
    this.scheduleCount += 1;
    this.scheduled.push({ generation, done: false });
  }

  flushOneScheduled() {
    const task = this.scheduled.find((item) => !item.done);
    if (!task) return { ran: false };
    task.done = true;
    if (!this.active || task.generation !== this.sessionGeneration) return { ran: true, stale: true };

    if (this.pendingCleanup) {
      this._cleanupDisconnected();
      this.pendingCleanup = false;
    }

    let consumed = 0;
    while (this.pendingRoots.length && consumed < this.batchBudget) {
      const root = this.pendingRoots.shift();
      this.pendingRootIds.delete(root.id);
      consumed += this._discoverBounded(root, this.batchBudget - consumed);
    }

    if (this.pendingRoots.length || this.pendingCleanup) this._ensureScheduled();
    return { ran: true, stale: false, consumed };
  }

  _discoverBounded(frame, remaining) {
    if (!frame?.connected || remaining <= 0) return 0;
    let consumed = 1;
    this.loadHandlers.add(frame.id);
    this.knownFrames.set(frame.id, frame);
    if (!frame.sameOrigin) return consumed;
    this.knownDocs.add(frame.docId);
    this.listenerDocs.add(frame.docId);
    for (const child of frame.children) {
      if (consumed >= remaining) {
        if (!this.pendingRootIds.has(child.id)) {
          this.pendingRootIds.add(child.id);
          this.pendingRoots.push(child);
        }
        continue;
      }
      consumed += this._discoverBounded(child, remaining - consumed);
    }
    return consumed;
  }

  onKnownFrameLoad(frame, nextDocId) {
    if (!this.active || !this.loadHandlers.has(frame.id)) return;
    const oldDocId = frame.docId;
    frame.docId = nextDocId;
    this.knownDocs.delete(oldDocId);
    this.listenerDocs.delete(oldDocId);
    if (frame.sameOrigin && frame.connected) {
      this.knownDocs.add(nextDocId);
      this.listenerDocs.add(nextDocId);
    }
  }

  _cleanupDisconnected() {
    for (const [id, frame] of [...this.knownFrames]) {
      if (frame.connected) continue;
      this.knownFrames.delete(id);
      this.loadHandlers.delete(id);
      this.knownDocs.delete(frame.docId);
      this.listenerDocs.delete(frame.docId);
    }
  }
}

function legacyCurrentShapeCounterexample() {
  const knownDocs = new Set(['top', 'doc:F1']);
  const inserted = new FrameNode('F2');
  // Current shape has no topology observer/scheduled discovery for a newly inserted frame.
  assert.strictEqual(knownDocs.has(inserted.docId), false);
  return 'P1-227 current-shape counterexample: newly inserted same-origin frame remains outside the manual-selection listener graph';
}

function run() {
  console.log(legacyCurrentShapeCounterexample());

  // A. New top-level same-origin frame becomes selectable without unrelated rediscovery.
  {
    const m = new LiveFrameTopologyModel();
    m.start([new FrameNode('F1')]);
    const f2 = new FrameNode('F2');
    m.onTopologyMutation({ added: [f2] });
    m.flushOneScheduled();
    assert(m.listenerDocs.has('doc:F2'));
  }

  // B. Nested newly inserted frames are recursively discovered under a bounded batch budget.
  {
    const deep = new FrameNode('F3');
    const mid = new FrameNode('F2', { children: [deep] });
    const m = new LiveFrameTopologyModel({ batchBudget: 1 });
    m.start([]);
    m.onTopologyMutation({ added: [mid] });
    while (m.scheduled.some((task) => !task.done)) m.flushOneScheduled();
    assert(m.listenerDocs.has('doc:F2'));
    assert(m.listenerDocs.has('doc:F3'));
  }

  // C. Replacing a frame revokes detached-document listeners and admits the replacement.
  {
    const oldFrame = new FrameNode('OLD');
    const m = new LiveFrameTopologyModel();
    m.start([oldFrame]);
    oldFrame.connected = false;
    const replacement = new FrameNode('NEW');
    m.onTopologyMutation({ removed: [oldFrame], added: [replacement] });
    m.flushOneScheduled();
    assert(!m.listenerDocs.has('doc:OLD'));
    assert(!m.loadHandlers.has('OLD'));
    assert(m.listenerDocs.has('doc:NEW'));
  }

  // D. Known-frame load remains a positive control for exact document replacement.
  {
    const f = new FrameNode('F');
    const m = new LiveFrameTopologyModel();
    m.start([f]);
    m.onKnownFrameLoad(f, 'doc:F:v2');
    assert(!m.listenerDocs.has('doc:F'));
    assert(m.listenerDocs.has('doc:F:v2'));
  }

  // E. Removal-only mutation cleans detached listener and load-handler ownership.
  {
    const f = new FrameNode('F');
    const m = new LiveFrameTopologyModel();
    m.start([f]);
    f.connected = false;
    m.onTopologyMutation({ removed: [f] });
    m.flushOneScheduled();
    assert(!m.listenerDocs.has('doc:F'));
    assert(!m.loadHandlers.has('F'));
  }

  // F. Mutation bursts coalesce to one scheduled task for one selection generation.
  {
    const m = new LiveFrameTopologyModel({ batchBudget: 10 });
    m.start([]);
    m.onTopologyMutation({ added: [new FrameNode('A')] });
    m.onTopologyMutation({ added: [new FrameNode('B')] });
    m.onTopologyMutation({ added: [new FrameNode('C')] });
    assert.strictEqual(m.scheduleCount, 1);
    m.flushOneScheduled();
    assert(m.listenerDocs.has('doc:A') && m.listenerDocs.has('doc:B') && m.listenerDocs.has('doc:C'));
  }

  // G. A scheduled task from selection generation A cannot attach authority after stop/restart B.
  {
    const m = new LiveFrameTopologyModel();
    m.start([]);
    const old = new FrameNode('OLD');
    m.onTopologyMutation({ added: [old] });
    m.stop();
    m.start([]);
    const result = m.flushOneScheduled();
    assert.strictEqual(result.stale, true);
    assert(!m.listenerDocs.has('doc:OLD'));
  }

  // H. Cross-origin frame elements may be tracked structurally but child DOM stays fail-closed.
  {
    const m = new LiveFrameTopologyModel();
    m.start([]);
    const x = new FrameNode('X', { sameOrigin: false, docId: 'doc:X-secret' });
    m.onTopologyMutation({ added: [x] });
    m.flushOneScheduled();
    assert(m.loadHandlers.has('X'));
    assert(!m.listenerDocs.has('doc:X-secret'));
  }

  // I. Budget overflow is deferred into later bounded turns rather than one unbounded scan or silent loss.
  {
    const m = new LiveFrameTopologyModel({ batchBudget: 2 });
    m.start([]);
    const frames = [1,2,3,4,5].map((n) => new FrameNode(`F${n}`));
    m.onTopologyMutation({ added: frames });
    const first = m.flushOneScheduled();
    assert(first.consumed <= 2);
    while (m.scheduled.some((task) => !task.done)) m.flushOneScheduled();
    for (const frame of frames) assert(m.listenerDocs.has(frame.docId));
  }

  console.log('P1-227 live same-origin frame topology deterministic model: PASS');
}

run();
