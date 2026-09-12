'use strict';

const assert = require('node:assert/strict');

class FakeDocument {
  constructor(name) {
    this.name = name;
    this.frames = [];
    this.selectionListeners = 0;
    this.observers = new Set();
  }
  mutate() {
    for (const callback of [...this.observers]) callback();
  }
}

class FakeFrame {
  constructor(name, contentDocument = null) {
    this.name = name;
    this.contentDocument = contentDocument;
    this.isConnected = true;
    this.loadHandlers = new Set();
  }
  fireLoad() {
    for (const callback of [...this.loadHandlers]) callback();
  }
}

function connect(parentDoc, frame) {
  parentDoc.frames.push(frame);
  frame.isConnected = true;
  return frame;
}

function disconnect(parentDoc, frame) {
  parentDoc.frames = parentDoc.frames.filter((candidate) => candidate !== frame);
  frame.isConnected = false;
}

class ManualMicrotasks {
  constructor() {
    this.queue = [];
  }
  enqueue(callback) {
    this.queue.push(callback);
  }
  flushOne() {
    const callback = this.queue.shift();
    if (callback) callback();
  }
  flushAll() {
    while (this.queue.length) this.flushOne();
  }
}

// Minimal current-source-shaped baseline: discovery is explicit, and load handlers
// exist only for frame elements that were already found by a discovery pass.
class CurrentSnapshotModel {
  constructor(topDocument) {
    this.topDocument = topDocument;
    this.documents = new Set();
    this.frameHandlers = new Map();
  }
  refresh() {
    const discovered = new Set();
    const discoveredFrames = new Set();
    const visit = (doc) => {
      if (!doc || discovered.has(doc)) return;
      discovered.add(doc);
      for (const frame of doc.frames) {
        discoveredFrames.add(frame);
        if (!this.frameHandlers.has(frame)) {
          const handler = () => this.refresh();
          this.frameHandlers.set(frame, handler);
          frame.loadHandlers.add(handler);
        }
        try {
          if (frame.contentDocument) visit(frame.contentDocument);
        } catch (_) {}
      }
    };
    visit(this.topDocument);
    this.documents = discovered;
    for (const [frame, handler] of [...this.frameHandlers]) {
      if (discoveredFrames.has(frame) && frame.isConnected) continue;
      frame.loadHandlers.delete(handler);
      this.frameHandlers.delete(frame);
    }
  }
}

// Research contract model, not production code. It models the invariants P1-227
// needs: per-discovered-document mutation observation, per-frame load ownership,
// coalesced rediscovery, exact session generation, cleanup, and a hard frame budget.
class LiveTopologyModel {
  constructor(topDocument, microtasks, { maxFramesPerFlush = 64 } = {}) {
    this.topDocument = topDocument;
    this.microtasks = microtasks;
    this.maxFramesPerFlush = maxFramesPerFlush;
    this.generation = 0;
    this.active = false;
    this.documents = new Set();
    this.documentObservers = new Map();
    this.frameHandlers = new Map();
    this.queuedGeneration = null;
    this.flushCount = 0;
    this.lastVisitedFrames = 0;
    this.lastBudgetExceeded = false;
  }

  start() {
    this._clearOwnedState();
    this.generation += 1;
    this.active = true;
    this.queuedGeneration = null;
    this._reconcile(this.generation);
    return this.generation;
  }

  stop() {
    this.generation += 1;
    this.active = false;
    this.queuedGeneration = null;
    this._clearOwnedState();
  }

  _clearOwnedState() {
    for (const [doc, callback] of this.documentObservers) doc.observers.delete(callback);
    this.documentObservers.clear();
    for (const doc of this.documents) doc.selectionListeners = 0;
    this.documents.clear();
    for (const [frame, handler] of this.frameHandlers) frame.loadHandlers.delete(handler);
    this.frameHandlers.clear();
  }

  _schedule(generation) {
    if (!this.active || generation !== this.generation) return;
    if (this.queuedGeneration === generation) return;
    this.queuedGeneration = generation;
    this.microtasks.enqueue(() => {
      if (this.queuedGeneration === generation) this.queuedGeneration = null;
      if (!this.active || generation !== this.generation) return;
      this.flushCount += 1;
      this._reconcile(generation);
    });
  }

  _observeDocument(doc, generation) {
    if (this.documentObservers.has(doc)) return;
    const callback = () => this._schedule(generation);
    this.documentObservers.set(doc, callback);
    doc.observers.add(callback);
  }

  _ownFrame(frame, generation) {
    if (this.frameHandlers.has(frame)) return;
    const handler = () => this._schedule(generation);
    this.frameHandlers.set(frame, handler);
    frame.loadHandlers.add(handler);
  }

  _reconcile(generation) {
    if (!this.active || generation !== this.generation) return;

    const discoveredDocs = new Set();
    const discoveredFrames = new Set();
    let visitedFrames = 0;
    let budgetExceeded = false;

    const visit = (doc) => {
      if (!doc || discoveredDocs.has(doc) || budgetExceeded) return;
      discoveredDocs.add(doc);
      for (const frame of doc.frames) {
        if (visitedFrames >= this.maxFramesPerFlush) {
          budgetExceeded = true;
          break;
        }
        visitedFrames += 1;
        discoveredFrames.add(frame);
        this._ownFrame(frame, generation);
        let child = null;
        try { child = frame.contentDocument; } catch (_) { child = null; }
        if (child) visit(child);
        if (budgetExceeded) break;
      }
    };

    visit(this.topDocument);
    this.lastVisitedFrames = visitedFrames;
    this.lastBudgetExceeded = budgetExceeded;

    for (const doc of this.documents) {
      if (!discoveredDocs.has(doc)) doc.selectionListeners = 0;
    }
    for (const [doc, observer] of [...this.documentObservers]) {
      if (discoveredDocs.has(doc)) continue;
      doc.observers.delete(observer);
      this.documentObservers.delete(doc);
    }
    for (const [frame, handler] of [...this.frameHandlers]) {
      if (discoveredFrames.has(frame) && frame.isConnected) continue;
      frame.loadHandlers.delete(handler);
      this.frameHandlers.delete(frame);
    }

    for (const doc of discoveredDocs) {
      doc.selectionListeners = 1;
      this._observeDocument(doc, generation);
    }
    this.documents = discoveredDocs;
  }
}

let checks = 0;
function check(label, fn) {
  fn();
  checks += 1;
  process.stdout.write(`ok ${checks} - ${label}\n`);
}

// Current-source negative control.
{
  const top = new FakeDocument('top');
  const initial = new FakeDocument('initial');
  connect(top, new FakeFrame('initial-frame', initial));
  const current = new CurrentSnapshotModel(top);
  current.refresh();
  check('current snapshot initially discovers existing child document', () => assert(current.documents.has(initial)));

  const late = new FakeDocument('late');
  const lateFrame = connect(top, new FakeFrame('late-frame', late));
  top.mutate();
  check('current snapshot does not discover a frame inserted after the pass', () => assert(!current.documents.has(late)));
  check('new current-snapshot frame has no load handler before another discovery', () => assert.equal(lateFrame.loadHandlers.size, 0));
  current.refresh();
  check('explicit unrelated refresh repairs the current-snapshot gap', () => assert(current.documents.has(late)));
}

const tasks = new ManualMicrotasks();
const top = new FakeDocument('top');
const child = new FakeDocument('child');
const nested = new FakeDocument('nested');
const childFrame = connect(top, new FakeFrame('child-frame', child));
connect(child, new FakeFrame('nested-frame', nested));
const live = new LiveTopologyModel(top, tasks, { maxFramesPerFlush: 8 });
const generation1 = live.start();

check('live model tracks top document', () => assert(live.documents.has(top)));
check('live model tracks initial child document', () => assert(live.documents.has(child)));
check('live model recursively tracks initial nested document', () => assert(live.documents.has(nested)));
check('each tracked document receives one logical selection-listener ownership', () => {
  assert.equal(top.selectionListeners, 1);
  assert.equal(child.selectionListeners, 1);
  assert.equal(nested.selectionListeners, 1);
});
check('each tracked document receives one mutation observer', () => assert.equal(live.documentObservers.size, 3));

const late = new FakeDocument('late');
const lateFrame = connect(top, new FakeFrame('late-frame', late));
top.mutate();
check('mutation schedules but does not synchronously mutate discovery authority', () => assert(!live.documents.has(late)));
tasks.flushAll();
check('coalesced mutation flush discovers newly inserted same-origin frame', () => assert(live.documents.has(late)));
check('newly discovered frame receives a load owner', () => assert.equal(lateFrame.loadHandlers.size, 1));

const deep = new FakeDocument('deep');
connect(late, new FakeFrame('deep-frame', deep));
late.mutate();
tasks.flushAll();
check('observer on newly discovered child finds later nested insertion', () => assert(live.documents.has(deep)));

const lazyFrame = connect(top, new FakeFrame('lazy-frame', null));
top.mutate();
tasks.flushAll();
check('inserted frame with no ready contentDocument is owned for later load', () => assert.equal(lazyFrame.loadHandlers.size, 1));
const lazyDoc = new FakeDocument('lazy-doc');
lazyFrame.contentDocument = lazyDoc;
lazyFrame.fireLoad();
tasks.flushAll();
check('frame load converges a previously unavailable child document', () => assert(live.documents.has(lazyDoc)));

const replacementDoc = new FakeDocument('replacement-doc');
const oldChild = childFrame.contentDocument;
childFrame.contentDocument = replacementDoc;
childFrame.fireLoad();
tasks.flushAll();
check('known frame navigation/replacement discovers the new document', () => assert(live.documents.has(replacementDoc)));
check('known frame navigation/replacement drops the old document', () => assert(!live.documents.has(oldChild)));
check('dropped document loses logical selection listener ownership', () => assert.equal(oldChild.selectionListeners, 0));
check('dropped document observer is disconnected', () => assert(!live.documentObservers.has(oldChild)));

const beforeBurst = live.flushCount;
for (let i = 0; i < 5; i += 1) top.mutate();
lateFrame.fireLoad();
check('mutation/load burst coalesces to one queued task', () => assert.equal(tasks.queue.length, 1));
tasks.flushAll();
check('mutation/load burst executes exactly one rediscovery flush', () => assert.equal(live.flushCount, beforeBurst + 1));

const detachedDoc = lateFrame.contentDocument;
disconnect(top, lateFrame);
top.mutate();
tasks.flushAll();
check('detached frame child document is removed from selection graph', () => assert(!live.documents.has(detachedDoc)));
check('detached frame load handler is cleaned', () => assert.equal(lateFrame.loadHandlers.size, 0));
check('detached document observer is cleaned', () => assert(!live.documentObservers.has(detachedDoc)));

const deniedFrame = new FakeFrame('denied-frame', null);
Object.defineProperty(deniedFrame, 'contentDocument', {
  get() { throw new Error('cross-origin denied'); },
  configurable: true,
});
connect(top, deniedFrame);
top.mutate();
check('inaccessible frame mutation does not throw before flush', () => assert.doesNotThrow(() => tasks.flushAll()));
check('inaccessible frame element can be lifecycle-owned without reading its document', () => assert.equal(deniedFrame.loadHandlers.size, 1));

const listenersBeforeIdempotent = replacementDoc.selectionListeners;
replacementDoc.mutate();
replacementDoc.mutate();
tasks.flushAll();
check('reconciliation is idempotent for document listener ownership', () => assert.equal(replacementDoc.selectionListeners, listenersBeforeIdempotent));
check('reconciliation does not duplicate frame load handlers', () => assert.equal(childFrame.loadHandlers.size, 1));

// Stale queued work must not cross stop/restart generation.
const staleDoc = new FakeDocument('stale-doc');
connect(top, new FakeFrame('stale-frame', staleDoc));
top.mutate();
check('old generation has queued work before stop', () => assert.equal(tasks.queue.length, 1));
live.stop();
check('stop clears all document observers immediately', () => assert.equal(live.documentObservers.size, 0));
check('stop clears all frame handlers immediately', () => assert.equal(live.frameHandlers.size, 0));
check('stop clears all tracked documents immediately', () => assert.equal(live.documents.size, 0));
const generation2 = live.start();
check('restart advances selection-session generation', () => assert(generation2 > generation1));
const flushBeforeStale = live.flushCount;
tasks.flushAll();
check('queued task from old generation cannot perform a new flush after restart', () => assert.equal(live.flushCount, flushBeforeStale));

// Capture an old handler closure, restart, and prove that invoking it cannot schedule work.
const currentHandler = [...childFrame.loadHandlers][0];
live.stop();
const generation3 = live.start();
const queueBeforeOldHandler = tasks.queue.length;
currentHandler();
check('stale frame-load closure cannot schedule across session generation', () => assert.equal(tasks.queue.length, queueBeforeOldHandler));
check('second restart advances generation again', () => assert(generation3 > generation2));

live.stop();
const queueBeforeIdleMutation = tasks.queue.length;
top.mutate();
check('mutation after stop cannot schedule rediscovery', () => assert.equal(tasks.queue.length, queueBeforeIdleMutation));

// Hard budget control on a separate graph.
const budgetTasks = new ManualMicrotasks();
const budgetTop = new FakeDocument('budget-top');
for (let i = 0; i < 10; i += 1) connect(budgetTop, new FakeFrame(`f${i}`, new FakeDocument(`d${i}`)));
const bounded = new LiveTopologyModel(budgetTop, budgetTasks, { maxFramesPerFlush: 4 });
bounded.start();
check('hard frame budget marks incomplete discovery instead of unbounded traversal', () => assert.equal(bounded.lastBudgetExceeded, true));
check('hard frame budget caps frame visits at configured bound', () => assert.equal(bounded.lastVisitedFrames, 4));
check('hard frame budget does not silently claim every child document', () => assert(bounded.documents.size < 11));

// Cycle/duplicate defensive control: same document reachable through two frame objects.
const cycleTasks = new ManualMicrotasks();
const cycleTop = new FakeDocument('cycle-top');
const shared = new FakeDocument('shared');
connect(cycleTop, new FakeFrame('a', shared));
connect(cycleTop, new FakeFrame('b', shared));
const cycle = new LiveTopologyModel(cycleTop, cycleTasks, { maxFramesPerFlush: 8 });
cycle.start();
check('duplicate document reachability is deduplicated by document identity', () => assert.equal(cycle.documents.size, 2));
check('duplicate document reachability still owns each distinct frame element once', () => assert.equal(cycle.frameHandlers.size, 2));

console.log(`PASS ${checks} checks`);
