'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentSource = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const agentSource = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registrySource = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidenceSource = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_199_CROSS_ORIGIN_PRINT_GENERATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function functionSlice(source, marker, nextMarkers = []) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing source marker: ${marker}`);
  const candidates = nextMarkers
    .map((next) => source.indexOf(next, start + marker.length))
    .filter((value) => value > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

// Current-main source receipts: these exact production files are byte-identical
// to the historical P1-199 provenance branch and remain the inspected mechanism.
assert.strictEqual(gitBlobSha(contentSource), 'f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e');
assert.strictEqual(gitBlobSha(agentSource), 'ce55145dc7ee1a4abf485b7fad3134ac39b61751');
assert.strictEqual(gitBlobSha(workerSource), '6d61ac81befdbf2804ae9dbec425aa08d1194eb1');

assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.version, '0.9.8');
assert.strictEqual(manifest.minimum_chrome_version, '118');

const ownerRow = '| P1-199 | ACTIVE | Cross-origin frame print prepare/restore state needs exact print-operation generation; stale restore cannot undo newer prepare. |';
assert.ok(registrySource.includes(ownerRow), 'P1-199 Registry owner/status changed unexpectedly.');
assert.ok(evidenceSource.includes('Canonical baseline: `main = 122a041ced8d33618a92878c4e824202ea88e0d1`'));
assert.ok(evidenceSource.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'));
assert.ok(evidenceSource.includes('P1-199 = ordered print-generation authority inside exact child document'));
assert.ok(evidenceSource.includes('P1-214 = distributed per-child mutation/compensation settlement using that generation'));
assert.ok(evidenceSource.includes('P1-218 = compare-before-restore authority for temporary resource attributes'));
assert.ok(!evidenceSource.includes('P1-232'), 'P1-199 refinement must not allocate a new P-code.');

// Current top source still tracks only frameId-level prepared state and sends no
// generation with prepare/restore commands.
assert.match(contentSource, /remotePrintPrepared:\s*new Set\(\)/);
const topPrepare = functionSlice(
  contentSource,
  'async function prepareRemoteFramesForPrint()',
  ['async function restoreRemoteFramesAfterPrint()', 'function restoreRemoteFramesAfterPrint()']
);
assert.match(topPrepare, /remotePrintPrepared\.clear\(\)/);
assert.match(topPrepare, /'prepare-print'/);
assert.doesNotMatch(topPrepare, /printGeneration/);

const topRestore = functionSlice(
  contentSource,
  'async function restoreRemoteFramesAfterPrint()',
  ['function restoreAfterPrint()', 'async function prepareForPrint(']
);
assert.match(topRestore, /'restore-print'/);
assert.doesNotMatch(topRestore, /printGeneration/);

// Current worker routing still drops the field entirely at the top->worker->child boundary.
const routeMarker = "case 'WEBCLIP_FRAME_AGENT_TARGET':";
const routeStart = workerSource.indexOf(routeMarker);
assert.ok(routeStart >= 0);
const routeEnd = workerSource.indexOf("case 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_REQUEST':", routeStart);
assert.ok(routeEnd > routeStart);
const routeBody = workerSource.slice(routeStart, routeEnd);
assert.match(routeBody, /mode:\s*message\.mode/);
assert.match(routeBody, /locator:/);
assert.doesNotMatch(routeBody, /printGeneration/);

// Current child remains one unversioned singleton print state.
assert.match(agentSource, /printStyle:\s*null,\s*changedAttrs:\s*\[\]/);
const childPrepareStart = agentSource.indexOf('async function preparePrint()');
const childRestoreStart = agentSource.indexOf('function restorePrint()', childPrepareStart);
assert.ok(childPrepareStart >= 0 && childRestoreStart > childPrepareStart);
const childPrepare = agentSource.slice(childPrepareStart, childRestoreStart);
const childRestoreEnd = agentSource.indexOf('chrome.runtime.onMessage.addListener', childRestoreStart);
const childRestore = agentSource.slice(childRestoreStart, childRestoreEnd > 0 ? childRestoreEnd : agentSource.length);
assert.match(childPrepare, /await prefetchSelected\(\)/);
assert.match(childPrepare, /state\.printStyle\s*=\s*s/);
assert.doesNotMatch(childPrepare, /printGeneration|highestSeen|closedThrough/);
assert.match(childRestore, /state\.printStyle\?\.remove\(\)/);
assert.match(childRestore, /state\.changedAttrs\.reverse\(\)/);
assert.doesNotMatch(childRestore, /printGeneration|highestSeen|closedThrough/);

function requireGeneration(value) {
  const g = Number(value);
  assert.ok(Number.isSafeInteger(g) && g > 0, `invalid generation: ${value}`);
  return g;
}

class LegacyChildPrintState {
  constructor(documentId) {
    this.documentId = documentId;
    this.styleGeneration = 0;
    this.resourceGeneration = 0;
  }

  prepare(generation) {
    const g = requireGeneration(generation);
    this.styleGeneration = g;
    this.resourceGeneration = g;
    return { ok: true, generation: g };
  }

  restore(_generation) {
    this.styleGeneration = 0;
    this.resourceGeneration = 0;
    return { ok: true };
  }
}

class FencedChildPrintState {
  constructor(documentId) {
    this.documentId = String(documentId || '');
    assert.ok(this.documentId);
    this.highestSeenGeneration = 0;
    this.closedThroughGeneration = 0;
    this.active = null;
    this.styleGeneration = 0;
    this.resourceGeneration = 0;
    this.cleanupLog = [];
  }

  ownerSafeCleanupActive(reason) {
    if (!this.active) return;
    this.cleanupLog.push({ generation: this.active.generation, reason });
    this.styleGeneration = 0;
    this.resourceGeneration = 0;
    this.active = null;
  }

  beginPrepare(generation) {
    const g = requireGeneration(generation);

    if (g <= this.closedThroughGeneration) {
      return { ok: true, stale: true, closed: true, printGeneration: g };
    }
    if (g < this.highestSeenGeneration) {
      return { ok: true, stale: true, older: true, printGeneration: g };
    }

    if (g === this.highestSeenGeneration && this.active?.generation === g) {
      if (this.active.phase === 'prepared') {
        return { ok: true, replay: true, prepared: true, printGeneration: g };
      }
      return { ok: true, replay: true, pending: true, printGeneration: g };
    }

    if (g > this.highestSeenGeneration) {
      if (this.active) this.ownerSafeCleanupActive('superseded-by-newer-generation');
      this.highestSeenGeneration = g;
      this.active = { generation: g, phase: 'preparing' };
    }

    return {
      ok: true,
      printGeneration: g,
      ticket: { documentId: this.documentId, generation: g }
    };
  }

  finishPrepare(ticket) {
    const g = requireGeneration(ticket?.generation);
    if (
      ticket?.documentId !== this.documentId ||
      g <= this.closedThroughGeneration ||
      g !== this.highestSeenGeneration ||
      this.active?.generation !== g ||
      this.active?.phase !== 'preparing'
    ) {
      return { ok: true, stale: true, printGeneration: g };
    }

    this.styleGeneration = g;
    this.resourceGeneration = g;
    this.active.phase = 'prepared';
    return { ok: true, prepared: true, printGeneration: g };
  }

  restore(generation) {
    const g = requireGeneration(generation);

    if (g < this.highestSeenGeneration) {
      return { ok: true, stale: true, restored: false, printGeneration: g };
    }

    // Closure is installed before cleanup. That is what fences an async
    // continuation of prepare(g) that resumes after this method returns.
    this.highestSeenGeneration = Math.max(this.highestSeenGeneration, g);
    this.closedThroughGeneration = Math.max(this.closedThroughGeneration, g);

    if (this.active && this.active.generation <= g) {
      this.ownerSafeCleanupActive(
        this.active.generation === g ? 'restore-current-generation' : 'restore-newer-fence-supersedes-older'
      );
    }

    return { ok: true, restored: true, printGeneration: g };
  }
}

class PrintGenerationIssuer {
  constructor(topDocumentId) {
    this.topDocumentId = String(topDocumentId || '');
    assert.ok(this.topDocumentId);
    this.next = 0;
  }

  admit() {
    assert.ok(this.next < Number.MAX_SAFE_INTEGER, 'printGeneration overflow');
    this.next += 1;
    return { topDocumentId: this.topDocumentId, printGeneration: this.next };
  }
}

class P1214CompensationLedger {
  constructor() {
    this.receipts = new Map();
  }

  issueBeforeSend({ childDocumentId, frameId, printGeneration }) {
    const g = requireGeneration(printGeneration);
    const key = `${childDocumentId}:${g}`;
    assert.ok(!this.receipts.has(key), 'duplicate mutation debt admission');
    const receipt = {
      childDocumentId,
      frameId,
      printGeneration: g,
      prepareState: 'issued-unknown',
      restoreState: 'pending'
    };
    this.receipts.set(key, receipt);
    return receipt;
  }

  markPrepared(receipt, echoedGeneration) {
    assert.strictEqual(requireGeneration(echoedGeneration), receipt.printGeneration);
    receipt.prepareState = 'prepared';
  }

  markRestoreUnknown(receipt) {
    receipt.restoreState = 'issued-unknown';
  }

  markRestored(receipt, echoedGeneration) {
    assert.strictEqual(requireGeneration(echoedGeneration), receipt.printGeneration);
    receipt.restoreState = 'restored';
  }
}

function makeAttributeReceipt({ generation, original, temporary }) {
  return {
    generation: requireGeneration(generation),
    original: { ...original },
    temporary: { ...temporary }
  };
}

function p1218CompareBeforeRestore(live, receipt, currentGeneration) {
  if (receipt.generation !== currentGeneration) return { wrote: false, reason: 'stale-generation', live };
  const sameTemporary = live.present === receipt.temporary.present && live.value === receipt.temporary.value;
  if (!sameTemporary) return { wrote: false, reason: 'host-superseded', live };
  return { wrote: true, reason: 'restored', live: { ...receipt.original } };
}

// 1. Current-shaped counterexample: stale restore G1 erases newer G2 state.
{
  const child = new LegacyChildPrintState('doc-A');
  child.prepare(1);
  child.prepare(2);
  child.restore(1);
  assert.strictEqual(child.styleGeneration, 0);
  assert.strictEqual(child.resourceGeneration, 0);
}

// 2. Target: stale restore G1 performs zero writes against prepared G2.
{
  const child = new FencedChildPrintState('doc-A');
  const g1 = child.beginPrepare(1);
  child.finishPrepare(g1.ticket);
  const g2 = child.beginPrepare(2);
  child.finishPrepare(g2.ticket);
  const stale = child.restore(1);
  assert.strictEqual(stale.stale, true);
  assert.strictEqual(child.styleGeneration, 2);
  assert.strictEqual(child.resourceGeneration, 2);
}

// 3. Restore can overtake late prepare of the same generation and permanently close it.
{
  const child = new FencedChildPrintState('doc-A');
  const pending = child.beginPrepare(7);
  child.restore(7);
  const lateFinish = child.finishPrepare(pending.ticket);
  assert.strictEqual(lateFinish.stale, true);
  assert.strictEqual(child.styleGeneration, 0);
  assert.strictEqual(child.beginPrepare(7).closed, true);
}

// 4. Older async prepare cannot publish after a newer generation supersedes it.
{
  const child = new FencedChildPrintState('doc-A');
  const pending1 = child.beginPrepare(1);
  const pending2 = child.beginPrepare(2);
  assert.strictEqual(child.finishPrepare(pending2.ticket).prepared, true);
  assert.strictEqual(child.finishPrepare(pending1.ticket).stale, true);
  assert.strictEqual(child.styleGeneration, 2);
}

// 5. Newer prepare supersedes old active state through the owner-safe cleanup hook.
{
  const child = new FencedChildPrintState('doc-A');
  const one = child.beginPrepare(1);
  child.finishPrepare(one.ticket);
  const two = child.beginPrepare(2);
  assert.deepStrictEqual(child.cleanupLog, [{ generation: 1, reason: 'superseded-by-newer-generation' }]);
  assert.strictEqual(child.styleGeneration, 0);
  child.finishPrepare(two.ticket);
  assert.strictEqual(child.styleGeneration, 2);
}

// 6. Duplicate prepared generation is an idempotent replay, not a second mutation set.
{
  const child = new FencedChildPrintState('doc-A');
  const first = child.beginPrepare(4);
  child.finishPrepare(first.ticket);
  const replay = child.beginPrepare(4);
  assert.strictEqual(replay.replay, true);
  assert.strictEqual(replay.prepared, true);
  assert.strictEqual(child.styleGeneration, 4);
}

// 7. Duplicate restore is idempotent and keeps the generation closed.
{
  const child = new FencedChildPrintState('doc-A');
  const first = child.beginPrepare(5);
  child.finishPrepare(first.ticket);
  child.restore(5);
  child.restore(5);
  assert.strictEqual(child.styleGeneration, 0);
  assert.strictEqual(child.closedThroughGeneration, 5);
  assert.strictEqual(child.beginPrepare(5).closed, true);
}

// 8. Restore for an unseen newer G advances the fence and blocks a later same-G prepare.
{
  const child = new FencedChildPrintState('doc-A');
  child.restore(9);
  assert.strictEqual(child.closedThroughGeneration, 9);
  assert.strictEqual(child.beginPrepare(9).closed, true);
}

// 9. Exact document identity scopes authority: equal numeric generations in replacement documents are independent.
{
  const oldDoc = new FencedChildPrintState('doc-old');
  const newDoc = new FencedChildPrintState('doc-new');
  const old = oldDoc.beginPrepare(1);
  const fresh = newDoc.beginPrepare(1);
  oldDoc.finishPrepare(old.ticket);
  newDoc.finishPrepare(fresh.ticket);
  oldDoc.restore(1);
  assert.strictEqual(oldDoc.styleGeneration, 0);
  assert.strictEqual(newDoc.styleGeneration, 1);
}

// 10. Worker restart does not reset a living child document's local closed fence.
{
  const child = new FencedChildPrintState('doc-A');
  child.restore(3);
  // Simulate worker-global memory loss by constructing no replacement child state.
  const newWorkerRegistry = new Map();
  assert.strictEqual(newWorkerRegistry.size, 0);
  assert.strictEqual(child.beginPrepare(3).closed, true);
}

// 11. Top print generation is distinct from client correlation and physical execution identity.
{
  const issuer = new PrintGenerationIssuer('top-doc-A');
  const clientCorrelation = 'same-client-operation';
  const physicalOperationId = 'worker-physical-42';
  const p1 = { clientCorrelation, physicalOperationId, ...issuer.admit() };
  const p2 = { clientCorrelation, physicalOperationId, ...issuer.admit() };
  assert.strictEqual(p1.clientCorrelation, p2.clientCorrelation);
  assert.strictEqual(p1.physicalOperationId, p2.physicalOperationId);
  assert.notStrictEqual(p1.printGeneration, p2.printGeneration);
}

// 12. P1-214 records per-child distributed mutation debt before transport and consumes P1-199 G.
{
  const issuer = new PrintGenerationIssuer('top-doc-A');
  const { printGeneration } = issuer.admit();
  const ledger = new P1214CompensationLedger();
  const a = ledger.issueBeforeSend({ childDocumentId: 'child-A', frameId: 5, printGeneration });
  const b = ledger.issueBeforeSend({ childDocumentId: 'child-B', frameId: 7, printGeneration });
  ledger.markPrepared(a, printGeneration);
  ledger.markRestoreUnknown(b);
  assert.strictEqual(a.printGeneration, b.printGeneration);
  assert.strictEqual(a.prepareState, 'prepared');
  assert.strictEqual(b.restoreState, 'issued-unknown');
  // P1-199 does not retire this debt; P1-214 owns terminal settlement.
}

// 13. P1-218 still blocks stale host overwrite even when P1-199 generation is current.
{
  const receipt = makeAttributeReceipt({
    generation: 2,
    original: { present: true, value: 'host-A' },
    temporary: { present: true, value: 'webclip-temp' }
  });
  const hostSuperseded = { present: true, value: 'host-B' };
  const result = p1218CompareBeforeRestore(hostSuperseded, receipt, 2);
  assert.strictEqual(result.wrote, false);
  assert.strictEqual(result.reason, 'host-superseded');
  assert.deepStrictEqual(result.live, hostSuperseded);
}

// 14. Older P1-218 receipt also cannot write after a newer P1-199 generation is current.
{
  const receipt = makeAttributeReceipt({
    generation: 1,
    original: { present: false, value: null },
    temporary: { present: true, value: 'webclip-g1' }
  });
  const live = { present: true, value: 'webclip-g1' };
  const result = p1218CompareBeforeRestore(live, receipt, 2);
  assert.strictEqual(result.wrote, false);
  assert.strictEqual(result.reason, 'stale-generation');
}

// 15. New top document can restart a local counter because exact document identity scopes the domain.
{
  const topA = new PrintGenerationIssuer('top-doc-A');
  const topB = new PrintGenerationIssuer('top-doc-B');
  assert.strictEqual(topA.admit().printGeneration, 1);
  assert.strictEqual(topB.admit().printGeneration, 1);
  assert.notStrictEqual(topA.topDocumentId, topB.topDocumentId);
}

console.log('P1-199 cross-origin print-generation refinement model: PASS');
