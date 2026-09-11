'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const frameAgent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_214_REMOTE_PRINT_PARTIAL_ROLLBACK_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

let checks = 0;
const failures = [];
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function sliceBetween(source, startNeedle, endNeedle = '') {
  const start = source.indexOf(startNeedle);
  if (start < 0) return '';
  let end = source.length;
  if (endNeedle) {
    const candidate = source.indexOf(endNeedle, start + startNeedle.length);
    if (candidate >= 0) end = candidate;
  }
  return source.slice(start, end);
}

// Current baseline / owner / release binding.
check(
  registry.includes('| P1-214 | ACTIVE | Multi-frame remote print prepare/restore needs exact partial-success rollback receipts and actual restore settlement per child/generation. |'),
  'P1-214 Registry owner/status drifted'
);
check(evidence.includes('main = 7abddcf132052e2d36350f696770f58e28c64a82'), 'evidence baseline drifted');
check(evidence.includes('content.js = f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e'), 'content provenance missing');
check(evidence.includes('frame-agent.js = ce55145dc7ee1a4abf485b7fad3134ac39b61751'), 'frame-agent provenance missing');
check(evidence.includes('service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1'), 'worker provenance missing');
check(evidence.includes('No historical branch is imported wholesale') || evidence.includes('rather than imported wholesale'), 'historical provenance boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release fence missing');
check(manifest.manifest_version === 3, 'manifest is no longer MV3');
check(manifest.version === '0.9.8', 'manifest version changed during research-only tranche');
check(Number(manifest.minimum_chrome_version) >= 118, 'minimum Chrome control changed below 118');

// Current top-page source proof.
check(/remotePrintPrepared\s*:\s*new Set\s*\(\s*\)/.test(content), 'current remotePrintPrepared Set disappeared');
const prepareTop = sliceBetween(content, 'async function prepareRemoteFramesForPrint()', 'async function restoreRemoteFramesAfterPrint()');
check(Boolean(prepareTop), 'prepareRemoteFramesForPrint missing');
check(/remotePrintPrepared\.clear\s*\(\s*\)/.test(prepareTop), 'prepare no longer clears current Set');
check(/commandMappedRemoteFrames\s*\(\s*['"]prepare-print['"]/.test(prepareTop), 'prepare no longer uses mapped remote prepare command');
check(/failClosed\s*:\s*true/.test(prepareTop), 'prepare no longer fail-closes aggregate command traversal');
check(/remotePrintPrepared\.add\s*\(\s*remote\.frameId\s*\)/.test(prepareTop), 'prepare no longer records only after aggregate response');

const restoreTop = sliceBetween(content, 'async function restoreRemoteFramesAfterPrint()', '\n  function ');
check(Boolean(restoreTop), 'restoreRemoteFramesAfterPrint missing');
check(/const ids\s*=\s*\[\.\.\.state\.remotePrintPrepared\]/.test(restoreTop), 'restore no longer snapshots current Set');
check(/remotePrintPrepared\.clear\s*\(\s*\)/.test(restoreTop), 'restore no longer clears ownership before settlement');
check(/targetRemoteFrame\s*\(\s*remote\s*,\s*['"]restore-print['"]\s*\)/.test(restoreTop), 'restore command disappeared');
check(/catch\s*\(_\)\s*\{\s*\}/.test(restoreTop), 'restore no longer swallows per-child error');
check(/remote\.printHeight\s*=\s*0/.test(restoreTop), 'restore no longer resets printHeight regardless of settlement');

// Current child mutation / singleton-state proof.
check(/printStyle\s*:\s*null/.test(frameAgent), 'frame-agent singleton printStyle missing');
check(/changedAttrs\s*:\s*\[\]/.test(frameAgent), 'frame-agent singleton changedAttrs missing');
const childPrepare = sliceBetween(frameAgent, 'async function preparePrint()', 'function restorePrint()');
check(/state\.phase\s*=\s*['"]printing['"]/.test(childPrepare), 'child prepare no longer enters printing phase');
check(/prefetchSelected\s*\(\s*\)/.test(childPrepare), 'child prepare no longer runs resource preparation');
check(/createElement\s*\(\s*['"]style['"]\s*\)/.test(childPrepare), 'child prepare no longer creates print style');
check(/state\.printStyle\s*=\s*s/.test(childPrepare), 'child prepare no longer overwrites singleton printStyle');
const childRestore = sliceBetween(frameAgent, 'function restorePrint()', 'chrome.runtime.onMessage.addListener');
check(/state\.printStyle\?\.remove/.test(childRestore), 'child restore no longer removes singleton printStyle');
check(/state\.changedAttrs\.reverse\s*\(\s*\)/.test(childRestore), 'child restore no longer restores singleton changedAttrs');
check(!/printGeneration/.test(childPrepare + childRestore), 'child unexpectedly gained printGeneration runtime implementation');

// Fresh worker-layer positive control and gap.
check(/documentId\s*:\s*boundedContentString\s*\(\s*sender\?\.documentId/.test(worker), 'worker no longer stores browser sender.documentId');
check(/record\.documentId\s*&&\s*senderDocumentId\s*&&\s*record\.documentId\s*!==\s*senderDocumentId/.test(worker), 'worker state forwarding no longer fences stale documentId');
const sendCommand = sliceBetween(worker, 'async function sendFrameAgentCommand', 'async function enableFrameAgentsForTab');
check(Boolean(sendCommand), 'sendFrameAgentCommand missing');
check(/chrome\.tabs\.sendMessage/.test(sendCommand), 'worker no longer uses tabs.sendMessage for child command');
check(/\{\s*frameId\s*:\s*fid\s*\}/.test(sendCommand), 'current frameId-only child command target changed');
check(!/documentId\s*:\s*record\.documentId/.test(sendCommand), 'runtime already exact-document targets child command; update research before merging');
check(/FRAME_AGENT_COMMAND_TIMEOUT_MS/.test(worker) && /const FRAME_AGENT_COMMAND_TIMEOUT_MS\s*=\s*5_000/.test(worker), 'worker child command timeout control changed');
check(/const FRAME_AGENT_MAX_PER_TAB\s*=\s*64/.test(worker), 'frame-agent per-tab bound changed');

check(evidence.includes('options.documentId — Chrome 106+'), 'Chrome exact-document platform evidence missing');
check(evidence.includes('minimum_chrome_version') && evidence.includes('118'), 'browser floor composition missing');
check(evidence.includes('timeout') && evidence.includes('issued-unknown'), 'timeout unknown-settlement rule missing');
check(evidence.includes('P1-199') && evidence.includes('P1-203') && evidence.includes('P1-201'), 'owner composition incomplete');

class Child {
  constructor(frameId, documentId) {
    this.frameId = frameId;
    this.documentId = documentId;
    this.activeGeneration = null;
    this.closed = new Set();
    this.prepareCalls = [];
    this.restoreCalls = [];
    this.receivedCommands = [];
  }

  prepare(generation, mode = 'success') {
    this.prepareCalls.push(generation);
    this.receivedCommands.push({ kind: 'prepare', generation, documentId: this.documentId });
    if (this.closed.has(generation)) return { ok: false, clean: true, code: 'closed-generation' };
    if (this.activeGeneration && this.activeGeneration !== generation) {
      return { ok: false, clean: false, code: 'cleanup-required' };
    }
    this.activeGeneration = generation;
    if (mode === 'failed-clean') {
      this.activeGeneration = null;
      this.closed.add(generation);
      return { ok: false, clean: true, code: 'failed-clean' };
    }
    if (mode === 'failed-dirty') return { ok: false, clean: false, code: 'failed-dirty' };
    return { ok: true, generation, documentId: this.documentId, height: 777 };
  }

  restore(generation, delivery = 'success') {
    this.restoreCalls.push(generation);
    if (delivery === 'not-delivered') return { delivered: false };
    this.receivedCommands.push({ kind: 'restore', generation, documentId: this.documentId });
    if (this.activeGeneration === generation) {
      this.activeGeneration = null;
      this.closed.add(generation);
      return { ok: true, clean: true, generation };
    }
    if (!this.activeGeneration || this.closed.has(generation)) {
      this.closed.add(generation);
      return { ok: true, clean: true, generation, alreadyClean: true };
    }
    return { ok: false, clean: false, code: 'different-active-generation' };
  }

  query(generation) {
    if (this.activeGeneration === generation) return { state: 'active', generation };
    if (this.closed.has(generation)) return { state: 'clean', generation };
    return { state: 'not-seen', generation };
  }
}

function key(frameId, documentId) {
  return `${frameId}:${documentId}`;
}

class Saga {
  constructor(generation) {
    this.generation = generation;
    this.receipts = new Map();
  }

  receipt(child) {
    const k = key(child.frameId, child.documentId);
    if (!this.receipts.has(k)) {
      this.receipts.set(k, {
        frameId: child.frameId,
        documentId: child.documentId,
        generation: this.generation,
        prepareState: 'not-issued',
        restoreState: 'not-needed',
        height: null,
        error: ''
      });
    }
    return this.receipts.get(k);
  }

  prepare(child, { transport = 'success', childMode = 'success' } = {}) {
    const r = this.receipt(child);
    r.prepareState = 'issued-unknown'; // before mutating transport

    if (transport === 'not-delivered') {
      r.error = 'prepare-not-delivered';
      r.restoreState = 'pending';
      return { ok: false, unknown: true };
    }

    const actual = child.prepare(this.generation, childMode);
    if (transport === 'response-lost') {
      r.error = 'prepare-response-lost';
      r.restoreState = 'pending';
      return { ok: false, unknown: true };
    }

    if (actual.ok) {
      r.prepareState = 'prepared';
      r.restoreState = 'pending';
      r.height = actual.height;
      return { ok: true };
    }
    if (actual.clean) {
      r.prepareState = 'failed-clean';
      r.restoreState = 'not-needed';
      r.error = actual.code;
      return { ok: false, clean: true };
    }
    r.restoreState = 'pending';
    r.error = actual.code || 'prepare-unknown';
    return { ok: false, unknown: true };
  }

  restore(child, { transport = 'success', observedDocumentId = child.documentId } = {}) {
    const matching = [...this.receipts.values()].find((r) => r.frameId === child.frameId && r.generation === this.generation);
    if (!matching) return { skipped: true };
    if (matching.documentId !== observedDocumentId) {
      matching.restoreState = 'document-gone';
      return { ok: true, documentGone: true };
    }
    if (matching.prepareState === 'failed-clean' || matching.prepareState === 'not-issued') {
      matching.restoreState = 'not-needed';
      return { ok: true, clean: true };
    }

    matching.restoreState = 'issued-unknown';
    if (transport === 'not-delivered') {
      matching.error = 'restore-not-delivered';
      return { ok: false, unknown: true };
    }

    const actual = child.restore(this.generation);
    if (transport === 'response-lost') {
      matching.error = 'restore-response-lost';
      return { ok: false, unknown: true };
    }
    if (actual.ok && actual.clean) {
      matching.restoreState = 'restored';
      matching.error = '';
      return { ok: true, clean: true };
    }
    matching.error = actual.code || 'restore-unknown';
    return { ok: false, unknown: true };
  }

  reconcile(child, observedDocumentId = child.documentId) {
    const r = [...this.receipts.values()].find((x) => x.frameId === child.frameId && x.generation === this.generation);
    if (!r) return { skipped: true };
    if (r.documentId !== observedDocumentId) {
      r.restoreState = 'document-gone';
      return { ok: true, documentGone: true };
    }
    const q = child.query(this.generation);
    if (q.state === 'clean' || q.state === 'not-seen') {
      r.restoreState = 'restored';
      return { ok: true, clean: true };
    }
    return { ok: false, active: true };
  }

  unresolved() {
    return [...this.receipts.values()].filter((r) =>
      ['issued-unknown', 'prepared'].includes(r.prepareState) &&
      !['restored', 'document-gone'].includes(r.restoreState)
    );
  }

  canAdmit(child) {
    return !this.unresolved().some((r) => r.frameId === child.frameId && r.documentId === child.documentId);
  }
}

// Current-shaped failure: receipt set is populated only after aggregate success.
function currentAggregatePrepare(childrenAndModes) {
  const prepared = new Set();
  const responses = [];
  for (const [child, mode] of childrenAndModes) {
    const result = child.prepare('CURRENT', mode);
    if (!result.ok) throw Object.assign(new Error('aggregate prepare failed'), { prepared });
    responses.push(child);
  }
  for (const child of responses) prepared.add(child.frameId);
  return prepared;
}

// 1. Current partial prepare loses A ownership after B failure.
{
  const a = new Child(1, 'doc-a');
  const b = new Child(2, 'doc-b');
  let thrown;
  try { currentAggregatePrepare([[a, 'success'], [b, 'failed-clean']]); } catch (e) { thrown = e; }
  check(Boolean(thrown), 'current partial prepare witness did not fail');
  check(a.query('CURRENT').state === 'active', 'current witness A did not remain prepared');
  check(thrown.prepared.size === 0, 'current witness unexpectedly tracked A');
}

// 2. Target records A incrementally and compensates it after B fails clean.
{
  const a = new Child(1, 'doc-a');
  const b = new Child(2, 'doc-b');
  const saga = new Saga('G1');
  check(saga.prepare(a).ok === true, 'target failed to prepare A');
  check(saga.prepare(b, { childMode: 'failed-clean' }).clean === true, 'target did not classify B failed-clean');
  check(saga.unresolved().length === 1, 'target lost A debt after B failure');
  check(saga.restore(a).clean === true, 'target failed to compensate A');
  check(saga.unresolved().length === 0, 'A debt not retired after exact restore');
}

// 3. Prepare response lost after mutation remains unknown debt.
{
  const a = new Child(3, 'doc-c');
  const saga = new Saga('G2');
  check(saga.prepare(a, { transport: 'response-lost' }).unknown === true, 'lost prepare response not unknown');
  check(a.query('G2').state === 'active', 'lost-response child is not actually active');
  check(saga.unresolved().length === 1, 'lost prepare response discarded debt');
}

// 4. Prepare not delivered uses same unknown receipt and can reconcile not-seen.
{
  const a = new Child(4, 'doc-d');
  const saga = new Saga('G3');
  saga.prepare(a, { transport: 'not-delivered' });
  check(saga.unresolved().length === 1, 'not-delivered prepare discarded issued debt');
  check(saga.reconcile(a).clean === true, 'not-seen prepare did not reconcile clean');
}

// 5. Restore not delivered retains debt.
{
  const a = new Child(5, 'doc-e');
  const saga = new Saga('G4');
  saga.prepare(a);
  check(saga.restore(a, { transport: 'not-delivered' }).unknown === true, 'restore not delivered not unknown');
  check(saga.unresolved().length === 1, 'unknown restore debt was retired');
  check(a.query('G4').state === 'active', 'child unexpectedly clean after non-delivery');
}

// 6. Restore applied but response lost is retired only by read-only reconcile.
{
  const a = new Child(6, 'doc-f');
  const saga = new Saga('G5');
  saga.prepare(a);
  check(saga.restore(a, { transport: 'response-lost' }).unknown === true, 'lost restore response not unknown');
  check(a.query('G5').state === 'clean', 'modeled restore did not actually clean child');
  check(saga.unresolved().length === 1, 'lost restore response retired debt too early');
  check(saga.reconcile(a).clean === true, 'read-only reconcile failed to retire actually clean debt');
}

// 7. One sibling can settle while another remains unknown.
{
  const a = new Child(7, 'doc-g');
  const b = new Child(8, 'doc-h');
  const saga = new Saga('G6');
  saga.prepare(a); saga.prepare(b);
  saga.restore(a);
  saga.restore(b, { transport: 'not-delivered' });
  check(saga.unresolved().length === 1 && saga.unresolved()[0].documentId === 'doc-h', 'sibling settlement collapsed into whole-saga result');
}

// 8. Unknown old debt blocks blind newer admission for same exact document.
{
  const a = new Child(9, 'doc-i');
  const old = new Saga('G7');
  old.prepare(a);
  old.restore(a, { transport: 'not-delivered' });
  check(old.canAdmit(a) === false, 'new print admitted over unresolved old debt');
}

// 9. Positively closed old generation allows newer one.
{
  const a = new Child(10, 'doc-j');
  const old = new Saga('G8');
  old.prepare(a); old.restore(a);
  check(old.canAdmit(a) === true, 'new print blocked after exact cleanup');
  check(a.prepare('G9').ok === true, 'new generation failed after exact old cleanup');
}

// 10. Stale restore of a closed old generation cannot undo newer active generation.
{
  const a = new Child(11, 'doc-k');
  a.prepare('G10'); a.restore('G10'); a.prepare('G11');
  const stale = a.restore('G10');
  check(stale.ok === true && stale.clean === true, 'stale closed-generation restore not idempotent');
  check(a.query('G11').state === 'active', 'stale old restore mutated newer generation');
}

// 11. Same frameId replacement is document-gone, never cleanup retargeting.
{
  const oldDoc = new Child(12, 'doc-old');
  const saga = new Saga('G12');
  saga.prepare(oldDoc);
  const replacement = new Child(12, 'doc-new');
  const result = saga.restore(replacement, { observedDocumentId: replacement.documentId });
  check(result.documentGone === true, 'replacement document did not retire old receipt as document-gone');
  check(replacement.restoreCalls.length === 0, 'old cleanup was retargeted to replacement document');
  check(replacement.receivedCommands.length === 0, 'replacement document received old command');
}

// 12. Exact document id plus generation are independent identities.
{
  const a1 = new Child(13, 'same-doc');
  const g1 = new Saga('G13');
  g1.prepare(a1); g1.restore(a1);
  const g2 = new Saga('G14');
  check(g2.prepare(a1).ok === true, 'same document could not enter newer generation after cleanup');
  check(g2.unresolved()[0].generation === 'G14', 'new generation receipt identity lost');
}

// 13. Height is receipt scoped and not cleanup authority.
{
  const a = new Child(14, 'doc-height');
  const saga = new Saga('G15');
  saga.prepare(a);
  const r = saga.unresolved()[0];
  check(r.height === 777, 'prepared receipt lost generation-scoped height');
  r.height = 0;
  check(saga.unresolved().length === 1, 'clearing height incorrectly retired cleanup debt');
}

// 14. Dirty prepare failure cannot be called failed-clean.
{
  const a = new Child(15, 'doc-dirty');
  const saga = new Saga('G16');
  const result = saga.prepare(a, { childMode: 'failed-dirty' });
  check(result.unknown === true, 'dirty child prepare failure misclassified');
  check(saga.unresolved().length === 1, 'dirty prepare failure lost compensation debt');
}

// 15. Evidence must preserve exact-document routing as necessary but insufficient.
check(evidence.includes('necessary but insufficient'), 'evidence lost exact-document defense-in-depth boundary');
check(evidence.includes('bounded per-child, exact-document, exact-print-generation compensation saga'), 'target invariant summary missing');
check(evidence.includes('AWS Prescriptive Guidance') && evidence.includes('Microsoft'), 'multi-source external comparison missing');
check(evidence.includes('StackOverflow') && evidence.includes('stackoverflow.com/questions/49542628'), 'community comparison search boundary missing');

if (failures.length) {
  console.error(`P1-214 refinement model: ${failures.length}/${checks} checks failed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P1-214 refinement model: ${checks} checks passed`);
