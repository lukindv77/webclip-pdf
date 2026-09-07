'use strict';

const assert = require('assert');

class NaiveFramePrintState {
  constructor() {
    this.styleGeneration = 0;
    this.changedAttributeGeneration = 0;
  }

  prepare(generation) {
    this.styleGeneration = generation;
    this.changedAttributeGeneration = generation;
    return { ok: true, generation };
  }

  restore(_generation) {
    this.styleGeneration = 0;
    this.changedAttributeGeneration = 0;
    return { ok: true };
  }
}

class FencedFramePrintState {
  constructor() {
    this.highestSeenGeneration = 0;
    this.closedThroughGeneration = 0;
    this.activeGeneration = 0;
    this.phase = 'idle';
    this.styleGeneration = 0;
    this.changedAttributeGeneration = 0;
  }

  cleanupActive() {
    this.styleGeneration = 0;
    this.changedAttributeGeneration = 0;
  }

  beginPrepare(generation) {
    const g = Number(generation);
    assert.ok(Number.isSafeInteger(g) && g > 0);

    if (g <= this.closedThroughGeneration) {
      return { ok: false, stale: true, reason: 'generation-closed' };
    }
    if (g < this.highestSeenGeneration) {
      return { ok: false, stale: true, reason: 'older-generation' };
    }

    if (g === this.highestSeenGeneration && this.activeGeneration === g) {
      if (this.phase === 'prepared') {
        return { ok: true, replay: true, prepared: true, generation: g };
      }
      return { ok: false, replay: true, pending: true, generation: g };
    }

    if (g > this.highestSeenGeneration) {
      this.cleanupActive();
      this.highestSeenGeneration = g;
      this.activeGeneration = g;
      this.phase = 'preparing';
    }

    return { ok: true, generation: g, ticket: { generation: g } };
  }

  finishPrepare(ticket) {
    const g = Number(ticket?.generation || 0);
    if (
      !Number.isSafeInteger(g) ||
      g <= this.closedThroughGeneration ||
      g !== this.highestSeenGeneration ||
      g !== this.activeGeneration ||
      this.phase !== 'preparing'
    ) {
      return { ok: false, stale: true, reason: 'prepare-superseded' };
    }

    this.styleGeneration = g;
    this.changedAttributeGeneration = g;
    this.phase = 'prepared';
    return { ok: true, generation: g };
  }

  restore(generation) {
    const g = Number(generation);
    assert.ok(Number.isSafeInteger(g) && g > 0);

    // A restore can arrive before the matching prepare settles. Advancing the
    // closed-through fence first makes a later same-generation prepare stale.
    if (g > this.highestSeenGeneration) {
      this.cleanupActive();
      this.highestSeenGeneration = g;
      this.closedThroughGeneration = Math.max(this.closedThroughGeneration, g);
      this.activeGeneration = 0;
      this.phase = 'idle';
      return { ok: true, closedUnseen: true, generation: g };
    }

    if (g < this.highestSeenGeneration) {
      return { ok: true, stale: true, generation: g };
    }

    this.closedThroughGeneration = Math.max(this.closedThroughGeneration, g);
    if (this.activeGeneration === g) {
      this.cleanupActive();
      this.activeGeneration = 0;
      this.phase = 'idle';
    }
    return { ok: true, generation: g };
  }
}

class TopFrameCoordinator {
  constructor() {
    this.nextGeneration = 0;
    this.issuedByFrame = new Map();
  }

  issuePrepare(frameKey) {
    const generation = ++this.nextGeneration;
    this.issuedByFrame.set(frameKey, generation);
    return generation;
  }

  generationToRestore(frameKey) {
    return this.issuedByFrame.get(frameKey) || 0;
  }

  forget(frameKey, generation) {
    if (this.issuedByFrame.get(frameKey) === generation) {
      this.issuedByFrame.delete(frameKey);
    }
  }
}

// 1. Current-shaped state is vulnerable: stale restore A erases newer prepare B.
{
  const frame = new NaiveFramePrintState();
  frame.prepare(1);
  frame.prepare(2);
  frame.restore(1);
  assert.equal(frame.styleGeneration, 0);
  assert.equal(frame.changedAttributeGeneration, 0);
}

// 2. Target: stale restore A cannot undo newer prepared generation B.
{
  const frame = new FencedFramePrintState();
  const a = frame.beginPrepare(1);
  assert.equal(frame.finishPrepare(a.ticket).ok, true);
  const b = frame.beginPrepare(2);
  assert.equal(frame.finishPrepare(b.ticket).ok, true);
  const staleRestore = frame.restore(1);
  assert.equal(staleRestore.stale, true);
  assert.equal(frame.styleGeneration, 2);
  assert.equal(frame.changedAttributeGeneration, 2);
}

// 3. Restore-before-prepare closes that generation; a late actual prepare cannot revive it.
{
  const frame = new FencedFramePrintState();
  const restore = frame.restore(7);
  assert.equal(restore.closedUnseen, true);
  const latePrepare = frame.beginPrepare(7);
  assert.equal(latePrepare.ok, false);
  assert.equal(latePrepare.reason, 'generation-closed');
  assert.equal(frame.styleGeneration, 0);
}

// 4. Async prepare A cannot publish after newer prepare B superseded it.
{
  const frame = new FencedFramePrintState();
  const a = frame.beginPrepare(1);
  const b = frame.beginPrepare(2);
  assert.equal(frame.finishPrepare(b.ticket).ok, true);
  const lateA = frame.finishPrepare(a.ticket);
  assert.equal(lateA.ok, false);
  assert.equal(lateA.reason, 'prepare-superseded');
  assert.equal(frame.styleGeneration, 2);
}

// 5. Newer prepare cleans older active print mutations before publishing its own state.
{
  const frame = new FencedFramePrintState();
  const a = frame.beginPrepare(1);
  assert.equal(frame.finishPrepare(a.ticket).ok, true);
  assert.equal(frame.styleGeneration, 1);
  const b = frame.beginPrepare(2);
  assert.equal(frame.styleGeneration, 0);
  assert.equal(frame.changedAttributeGeneration, 0);
  assert.equal(frame.finishPrepare(b.ticket).ok, true);
  assert.equal(frame.styleGeneration, 2);
}

// 6. Restore of the current generation is idempotent and leaves a tombstone fence.
{
  const frame = new FencedFramePrintState();
  const a = frame.beginPrepare(3);
  frame.finishPrepare(a.ticket);
  assert.equal(frame.restore(3).ok, true);
  assert.equal(frame.restore(3).ok, true);
  assert.equal(frame.styleGeneration, 0);
  assert.equal(frame.beginPrepare(3).reason, 'generation-closed');
}

// 7. Duplicate prepare of an already prepared current generation is idempotent, not a second mutation set.
{
  const frame = new FencedFramePrintState();
  const a = frame.beginPrepare(4);
  frame.finishPrepare(a.ticket);
  const duplicate = frame.beginPrepare(4);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.replay, true);
  assert.equal(duplicate.prepared, true);
  assert.equal(frame.styleGeneration, 4);
}

// 8. Coordinator records issued generation before waiting for the remote response.
{
  const coordinator = new TopFrameCoordinator();
  const g = coordinator.issuePrepare('frame:5');
  assert.equal(coordinator.generationToRestore('frame:5'), g);
  // A timeout/unknown settlement must still leave enough local knowledge to issue restore(g).
}

// 9. Unknown prepare settlement + cleanup is safe even if the actual prepare arrives later.
{
  const coordinator = new TopFrameCoordinator();
  const frame = new FencedFramePrintState();
  const g = coordinator.issuePrepare('frame:5');
  frame.restore(g); // cleanup races ahead of the late actual prepare
  const late = frame.beginPrepare(g);
  assert.equal(late.ok, false);
  assert.equal(frame.styleGeneration, 0);
}

// 10. An older restore remains harmless after multiple newer generations.
{
  const frame = new FencedFramePrintState();
  for (const g of [1, 2, 3]) {
    const p = frame.beginPrepare(g);
    frame.finishPrepare(p.ticket);
  }
  frame.restore(1);
  frame.restore(2);
  assert.equal(frame.styleGeneration, 3);
  assert.equal(frame.restore(3).ok, true);
  assert.equal(frame.styleGeneration, 0);
}

// 11. Print generation is an ordering fence, not caller correlation/ownership identity.
{
  const coordinator = new TopFrameCoordinator();
  const clientCorrelation = 'same-client-operation';
  const first = { clientCorrelation, printGeneration: coordinator.issuePrepare('frame:A') };
  const second = { clientCorrelation, printGeneration: coordinator.issuePrepare('frame:A') };
  assert.equal(first.clientCorrelation, second.clientCorrelation);
  assert.notEqual(first.printGeneration, second.printGeneration);
}

// 12. Generation comparison is scoped by exact frame-document key; P1-171 supplies that key.
{
  const coordinator = new TopFrameCoordinator();
  const oldDoc = coordinator.issuePrepare('tab:1/frame:5/document:old');
  const newDoc = coordinator.issuePrepare('tab:1/frame:5/document:new');
  assert.notEqual(oldDoc, newDoc);
  assert.equal(coordinator.generationToRestore('tab:1/frame:5/document:old'), oldDoc);
  assert.equal(coordinator.generationToRestore('tab:1/frame:5/document:new'), newDoc);
}

console.log('P1-199 cross-origin print generation model: PASS');
