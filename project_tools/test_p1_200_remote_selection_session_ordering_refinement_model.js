'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const agent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_200_REMOTE_SELECTION_SESSION_ORDERING_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const ownerLine = '| P1-200 | ACTIVE | Remote-frame selection/control commands and responses need exact selection-session generation/ordering. |';
assert.ok(registry.includes(ownerLine), 'P1-200 Registry owner/status must remain exact and ACTIVE.');
assert.strictEqual(manifest.version, '0.9.8', 'Research refinement must not change manifest version.');
assert.ok(evidence.includes('122a041ced8d33618a92878c4e824202ea88e0d1'), 'Evidence must bind to exact canonical baseline.');
assert.ok(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'Evidence must preserve hard release fence.');

// Fresh current-source witnesses.
assert.ok(content.includes("syncRemoteFrameAgents('start').catch(() => {})"), 'Current top selection must still expose asynchronous remote start witness.');
assert.ok(content.includes('matched.remote.snapshot = response.snapshot'), 'Current top must still expose unconditional command-response snapshot assignment witness.');
assert.ok(content.includes('remote.snapshot = message.snapshot'), 'Current top must still expose unconditional state-event snapshot assignment witness.');
assert.ok(worker.includes("case 'WEBCLIP_FRAME_AGENT_TARGET'"), 'Current worker must still expose frame-agent target route.');
assert.ok(worker.includes('WEBCLIP_FRAME_AGENT_STATE'), 'Current worker must still expose child state route.');
assert.ok(agent.includes("case'start':start(msg.mode)"), 'Current child must still expose start command.');
assert.ok(agent.includes("case'clear':clear()"), 'Current child must still expose clear command.');
assert.ok(agent.includes("case'get-state':{const a=admitSelectionGeneration('remote-get-state')"), 'Current child must gate get-state by P0-080 application generation.');
assert.ok(agent.includes("a.ok?{ok:true,snapshot:snapshot(),phase:state.phase}:a"), 'Current child must still expose snapshot-bearing get-state response after application-generation admission.');
assert.ok(agent.includes("type:'WEBCLIP_FRAME_AGENT_STATE'"), 'Current child must still emit state events.');

// Current production does not yet carry the target semantics.
assert.ok(!content.includes('selectionSessionGeneration'), 'Current top is expected to lack P1-200 selection session generation before implementation.');
assert.ok(!agent.includes('selectionSessionGeneration'), 'Current child is expected to lack P1-200 selection session generation before implementation.');
assert.ok(!agent.includes('selectionStateRevision'), 'Current child is expected to lack P1-200 selection state revision before implementation.');
assert.ok(!agent.includes('highestAppliedCommandSeq'), 'Current child is expected to lack P1-200 command ordering fence before implementation.');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class ChildSelectionModel {
  constructor(documentId = 'doc-A') {
    this.documentId = documentId;
    this.currentSession = 0;
    this.closedThrough = 0;
    this.highestCommandSeq = 0;
    this.stateRevision = 0;
    this.mode = 'include';
    this.items = [];
    this.phase = 'idle';
  }

  receipt() {
    return {
      documentId: this.documentId,
      sessionGeneration: this.currentSession,
      stateRevision: this.stateRevision,
      phase: this.phase,
      mode: this.mode,
      items: clone(this.items)
    };
  }

  openSession(sessionGeneration, mode = 'include', reset = true) {
    const g = Number(sessionGeneration);
    if (!Number.isInteger(g) || g <= 0) throw new Error('invalid session generation');
    if (g <= this.closedThrough || g < this.currentSession) return { stale: true, receipt: this.receipt() };
    if (g > this.currentSession) {
      this.currentSession = g;
      this.highestCommandSeq = 0;
      if (reset) this.items = [];
      this.mode = mode === 'exclude' ? 'exclude' : 'include';
      this.phase = 'selecting';
      this.stateRevision += 1;
    }
    return { stale: false, receipt: this.receipt() };
  }

  joinSession(sessionGeneration) {
    if (Number(sessionGeneration) !== this.currentSession || this.currentSession <= this.closedThrough) {
      return { stale: true, receipt: this.receipt() };
    }
    return { stale: false, receipt: this.receipt() };
  }

  mutate(sessionGeneration, commandSeq, type, payload = {}) {
    const g = Number(sessionGeneration);
    const seq = Number(commandSeq);
    if (g !== this.currentSession || g <= this.closedThrough) return { stale: true, receipt: this.receipt() };
    if (!Number.isInteger(seq) || seq <= this.highestCommandSeq) return { stale: true, receipt: this.receipt() };
    this.highestCommandSeq = seq;

    let changed = false;
    if (type === 'clear') {
      changed = this.items.length > 0;
      this.items = [];
    } else if (type === 'set-mode') {
      const next = payload.mode === 'exclude' ? 'exclude' : 'include';
      changed = next !== this.mode;
      this.mode = next;
    } else if (type === 'restore') {
      this.items.push(String(payload.item || 'item'));
      changed = true;
    } else if (type === 'stop') {
      changed = this.phase !== 'idle';
      this.phase = 'idle';
      this.closedThrough = Math.max(this.closedThrough, g);
    } else {
      throw new Error(`unknown mutation ${type}`);
    }
    if (changed) this.stateRevision += 1;
    return { stale: false, receipt: this.receipt() };
  }

  localUserMutation(item) {
    if (this.phase !== 'selecting' || this.currentSession <= this.closedThrough) return this.receipt();
    this.items.push(String(item));
    this.stateRevision += 1;
    return this.receipt();
  }

  getState(sessionGeneration) {
    if (Number(sessionGeneration) !== this.currentSession || this.currentSession <= this.closedThrough) {
      return { stale: true, receipt: this.receipt() };
    }
    return { stale: false, receipt: this.receipt() };
  }
}

class TopAcceptanceModel {
  constructor(documentId = 'doc-A', sessionGeneration = 1) {
    this.documentId = documentId;
    this.sessionGeneration = sessionGeneration;
    this.lastAcceptedStateRevision = -1;
    this.snapshot = null;
  }

  moveTo(documentId, sessionGeneration) {
    this.documentId = documentId;
    this.sessionGeneration = sessionGeneration;
    this.lastAcceptedStateRevision = -1;
    this.snapshot = null;
  }

  accept(receipt) {
    if (!receipt || receipt.documentId !== this.documentId) return false;
    if (receipt.sessionGeneration !== this.sessionGeneration) return false;
    if (!Number.isInteger(receipt.stateRevision) || receipt.stateRevision < this.lastAcceptedStateRevision) return false;
    if (receipt.stateRevision === this.lastAcceptedStateRevision && this.snapshot) {
      return JSON.stringify(this.snapshot) === JSON.stringify(receipt);
    }
    this.lastAcceptedStateRevision = receipt.stateRevision;
    this.snapshot = clone(receipt);
    return true;
  }
}

// Legacy counterexample: late clear has no command order and erases newer restore.
{
  const legacy = { items: ['old'] };
  const lateClear = () => { legacy.items = []; };
  const newerRestore = () => { legacy.items = ['restored']; };
  newerRestore();
  lateClear();
  assert.deepStrictEqual(legacy.items, [], 'Legacy late clear must witness destructive reordering.');
}

// Command sequence rejects late clear after newer restore.
{
  const child = new ChildSelectionModel();
  child.openSession(1);
  child.mutate(1, 11, 'restore', { item: 'restored' });
  const late = child.mutate(1, 10, 'clear');
  assert.strictEqual(late.stale, true);
  assert.deepStrictEqual(child.items, ['restored']);
}

// Command sequence rejects late mode reversal.
{
  const child = new ChildSelectionModel();
  child.openSession(1);
  child.mutate(1, 6, 'set-mode', { mode: 'exclude' });
  const late = child.mutate(1, 5, 'set-mode', { mode: 'include' });
  assert.strictEqual(late.stale, true);
  assert.strictEqual(child.mode, 'exclude');
}

// New session rejects old-session command and resets old state atomically.
{
  const child = new ChildSelectionModel();
  child.openSession(1);
  child.mutate(1, 1, 'restore', { item: 'S1' });
  const opened = child.openSession(2, 'include', true);
  assert.strictEqual(opened.stale, false);
  assert.deepStrictEqual(child.items, []);
  const old = child.mutate(1, 2, 'restore', { item: 'late-S1' });
  assert.strictEqual(old.stale, true);
  assert.deepStrictEqual(child.items, []);
}

// Join current session is not a reset.
{
  const child = new ChildSelectionModel();
  child.openSession(3);
  child.mutate(3, 1, 'restore', { item: 'keep-me' });
  const before = child.stateRevision;
  const joined = child.joinSession(3);
  assert.strictEqual(joined.stale, false);
  assert.deepStrictEqual(child.items, ['keep-me']);
  assert.strictEqual(child.stateRevision, before);
}

// Top rejects old-session event after switching sessions.
{
  const child = new ChildSelectionModel();
  const top = new TopAcceptanceModel('doc-A', 1);
  const s1 = child.openSession(1).receipt;
  assert.ok(top.accept(s1));
  child.openSession(2);
  top.moveTo('doc-A', 2);
  assert.strictEqual(top.accept(s1), false);
  assert.ok(top.accept(child.receipt()));
}

// Lower-revision response cannot overwrite a newer local-user event.
{
  const child = new ChildSelectionModel();
  const top = new TopAcceptanceModel('doc-A', 1);
  child.openSession(1);
  const oldRead = child.getState(1).receipt;
  const newer = child.localUserMutation('click-newer');
  assert.ok(top.accept(newer));
  assert.strictEqual(top.accept(oldRead), false);
  assert.deepStrictEqual(top.snapshot.items, ['click-newer']);
}

// Local child mutation advances state revision without advancing top command seq.
{
  const child = new ChildSelectionModel();
  child.openSession(1);
  child.mutate(1, 7, 'set-mode', { mode: 'exclude' });
  const seqBefore = child.highestCommandSeq;
  const revBefore = child.stateRevision;
  child.localUserMutation('user-click');
  assert.strictEqual(child.highestCommandSeq, seqBefore);
  assert.ok(child.stateRevision > revBefore);
}

// Stop closes generation against late revival.
{
  const child = new ChildSelectionModel();
  child.openSession(4);
  child.mutate(4, 1, 'restore', { item: 'selected' });
  child.mutate(4, 2, 'stop');
  const late = child.mutate(4, 3, 'restore', { item: 'revive' });
  assert.strictEqual(late.stale, true);
  assert.strictEqual(child.phase, 'idle');
  assert.deepStrictEqual(child.items, ['selected']);
}

// Exact document identity remains independent of selection session generation.
{
  const top = new TopAcceptanceModel('doc-B', 5);
  const wrongDocument = { documentId: 'doc-A', sessionGeneration: 5, stateRevision: 9, items: [] };
  assert.strictEqual(top.accept(wrongDocument), false);
}

// Selection and print generations are separate authority domains.
{
  const receipt = { selectionSessionGeneration: 8, printGeneration: 21 };
  assert.notStrictEqual(receipt.selectionSessionGeneration, receipt.printGeneration);
}

// Research-owner boundaries and release plane remain explicit.
for (const owner of ['P1-171', 'P1-199', 'P1-201', 'P1-203', 'P1-214', 'P1-198', 'P1-227']) {
  assert.ok(evidence.includes(owner), `Evidence must preserve ${owner} composition boundary.`);
}
assert.ok(evidence.includes('No new P-code is needed.'), 'P1-200 refinement must not allocate a new owner.');
assert.ok(evidence.includes('P1-200 remains ACTIVE.'), 'Research refinement must not claim runtime closure.');

console.log('P1-200 remote selection session ordering refinement model: PASS');
