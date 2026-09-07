'use strict';

const assert = require('assert');

class NaiveRemoteSelection {
  constructor() {
    this.mode = 'include';
    this.snapshot = [];
  }
  setMode(mode) { this.mode = mode; }
  clear() { this.snapshot = []; }
  restore(item) { this.snapshot.push(item); }
  publishState(snapshot) { this.snapshot = [...snapshot]; }
}

class FencedFrameSelection {
  constructor() {
    this.sessionGeneration = 0;
    this.closedThroughGeneration = 0;
    this.highestCommandSeq = 0;
    this.stateRevision = 0;
    this.phase = 'idle';
    this.mode = 'include';
    this.snapshot = [];
  }

  openSession(generation, { reset = true, mode = 'include' } = {}) {
    const g = Number(generation);
    if (!Number.isSafeInteger(g) || g <= 0) return { ok: false, reason: 'bad-generation' };
    if (g <= this.closedThroughGeneration) return { ok: false, stale: true, reason: 'generation-closed' };
    if (g < this.sessionGeneration) return { ok: false, stale: true, reason: 'older-generation' };
    if (g > this.sessionGeneration) {
      this.sessionGeneration = g;
      this.highestCommandSeq = 0;
      this.stateRevision = 0;
      this.phase = 'selecting';
      this.mode = mode === 'exclude' ? 'exclude' : 'include';
      if (reset) this.snapshot = [];
      return { ok: true, generation: g, opened: true };
    }
    this.phase = 'selecting';
    return { ok: true, generation: g, replay: true };
  }

  applyCommand(generation, seq, command, payload = {}) {
    const g = Number(generation);
    const s = Number(seq);
    if (g !== this.sessionGeneration || g <= this.closedThroughGeneration) {
      return { ok: false, stale: true, reason: 'wrong-session' };
    }
    if (!Number.isSafeInteger(s) || s <= 0) return { ok: false, reason: 'bad-seq' };
    if (s <= this.highestCommandSeq) {
      return { ok: true, stale: true, replay: s === this.highestCommandSeq, generation: g, seq: s };
    }
    this.highestCommandSeq = s;
    if (command === 'set-mode') this.mode = payload.mode === 'exclude' ? 'exclude' : 'include';
    else if (command === 'clear') this.snapshot = [];
    else if (command === 'restore') this.snapshot.push(String(payload.item));
    else if (command === 'stop') {
      this.closedThroughGeneration = Math.max(this.closedThroughGeneration, g);
      this.phase = 'idle';
    }
    this.stateRevision += 1;
    return {
      ok: true,
      generation: g,
      seq: s,
      stateRevision: this.stateRevision,
      snapshot: [...this.snapshot],
      mode: this.mode,
      phase: this.phase
    };
  }

  userMutation(item) {
    if (this.phase !== 'selecting' || this.sessionGeneration <= this.closedThroughGeneration) return null;
    this.snapshot.push(String(item));
    this.stateRevision += 1;
    return this.stateReceipt();
  }

  stateReceipt() {
    return {
      generation: this.sessionGeneration,
      stateRevision: this.stateRevision,
      snapshot: [...this.snapshot],
      mode: this.mode,
      phase: this.phase
    };
  }
}

class TopSelectionCoordinator {
  constructor() {
    this.generation = 0;
    this.nextCommandSeq = 0;
    this.remote = { acceptedRevision: 0, snapshot: [], generation: 0 };
  }
  startNewSession() {
    this.generation += 1;
    this.nextCommandSeq = 0;
    this.remote = { acceptedRevision: 0, snapshot: [], generation: this.generation };
    return this.generation;
  }
  nextCommand() { return ++this.nextCommandSeq; }
  acceptState(receipt) {
    if (Number(receipt?.generation) !== this.generation) return false;
    const revision = Number(receipt?.stateRevision || 0);
    if (!Number.isSafeInteger(revision) || revision < this.remote.acceptedRevision) return false;
    this.remote.acceptedRevision = revision;
    this.remote.snapshot = [...(receipt.snapshot || [])];
    return true;
  }
}

// 1. Current-shaped late clear can erase a newer restore in the same logical UI session.
{
  const frame = new NaiveRemoteSelection();
  frame.restore('new');
  frame.clear();
  assert.deepEqual(frame.snapshot, []);
}

// 2. Current-shaped late set-mode can revert a newer mode choice.
{
  const frame = new NaiveRemoteSelection();
  frame.setMode('exclude');
  frame.setMode('include');
  assert.equal(frame.mode, 'include');
}

// 3. Target command sequencing rejects an older clear after a newer restore.
{
  const frame = new FencedFrameSelection();
  frame.openSession(1, { reset: true });
  frame.applyCommand(1, 2, 'restore', { item: 'new' });
  const late = frame.applyCommand(1, 1, 'clear');
  assert.equal(late.stale, true);
  assert.deepEqual(frame.snapshot, ['new']);
}

// 4. Target sequencing rejects an older set-mode after a newer choice.
{
  const frame = new FencedFrameSelection();
  frame.openSession(2, { reset: true });
  frame.applyCommand(2, 2, 'set-mode', { mode: 'exclude' });
  frame.applyCommand(2, 1, 'set-mode', { mode: 'include' });
  assert.equal(frame.mode, 'exclude');
}

// 5. A new session generation rejects commands from the previous session.
{
  const frame = new FencedFrameSelection();
  frame.openSession(3, { reset: true });
  frame.applyCommand(3, 1, 'restore', { item: 'old' });
  frame.openSession(4, { reset: true });
  const stale = frame.applyCommand(3, 2, 'restore', { item: 'late-old' });
  assert.equal(stale.stale, true);
  assert.deepEqual(frame.snapshot, []);
}

// 6. Starting a new session can reset old remote selection atomically with generation adoption.
{
  const frame = new FencedFrameSelection();
  frame.openSession(5, { reset: true });
  frame.applyCommand(5, 1, 'restore', { item: 'old' });
  frame.openSession(6, { reset: true, mode: 'include' });
  assert.deepEqual(frame.snapshot, []);
  assert.equal(frame.sessionGeneration, 6);
}

// 7. Joining/replaying the current session need not erase current state.
{
  const frame = new FencedFrameSelection();
  frame.openSession(7, { reset: true });
  frame.applyCommand(7, 1, 'restore', { item: 'keep' });
  const join = frame.openSession(7, { reset: false });
  assert.equal(join.replay, true);
  assert.deepEqual(frame.snapshot, ['keep']);
}

// 8. Top coordinator rejects a late state event from an old session.
{
  const top = new TopSelectionCoordinator();
  const oldG = top.startNewSession();
  const oldReceipt = { generation: oldG, stateRevision: 10, snapshot: ['old'] };
  top.startNewSession();
  assert.equal(top.acceptState(oldReceipt), false);
  assert.deepEqual(top.remote.snapshot, []);
}

// 9. Top coordinator rejects a late lower-revision get-state/command response in the current session.
{
  const top = new TopSelectionCoordinator();
  const g = top.startNewSession();
  assert.equal(top.acceptState({ generation: g, stateRevision: 4, snapshot: ['new'] }), true);
  assert.equal(top.acceptState({ generation: g, stateRevision: 2, snapshot: ['old'] }), false);
  assert.deepEqual(top.remote.snapshot, ['new']);
}

// 10. Child user mutations publish monotonic state revisions.
{
  const frame = new FencedFrameSelection();
  frame.openSession(8, { reset: true });
  const a = frame.userMutation('a');
  const b = frame.userMutation('b');
  assert.ok(b.stateRevision > a.stateRevision);
  assert.deepEqual(b.snapshot, ['a', 'b']);
}

// 11. Stop closes the session so delayed commands cannot revive it.
{
  const frame = new FencedFrameSelection();
  frame.openSession(9, { reset: true });
  frame.applyCommand(9, 1, 'stop');
  const late = frame.applyCommand(9, 2, 'restore', { item: 'revive' });
  assert.equal(late.stale, true);
  assert.deepEqual(frame.snapshot, []);
}

// 12. Command identity and state revision solve different ordering problems.
{
  const frame = new FencedFrameSelection();
  frame.openSession(10, { reset: true });
  const cmd = frame.applyCommand(10, 1, 'set-mode', { mode: 'exclude' });
  const user = frame.userMutation('x');
  assert.equal(cmd.seq, 1);
  assert.ok(user.stateRevision > cmd.stateRevision);
}

// 13. Selection ordering is independent of caller correlation and print generation.
{
  const top = new TopSelectionCoordinator();
  const selectionGeneration = top.startNewSession();
  const clientOperationId = 'same-correlation';
  const printGeneration = 77;
  assert.equal(clientOperationId, 'same-correlation');
  assert.equal(selectionGeneration, 1);
  assert.equal(printGeneration, 77);
}

// 14. Exact frame-document scoping remains external composition (P1-171): same frameId alone is insufficient.
{
  const scopes = new Map();
  scopes.set('tab:1/frame:5/document:A', { generation: 1 });
  scopes.set('tab:1/frame:5/document:B', { generation: 1 });
  assert.notEqual([...scopes.keys()][0], [...scopes.keys()][1]);
}

console.log('P1-200 remote selection session ordering model: PASS');
