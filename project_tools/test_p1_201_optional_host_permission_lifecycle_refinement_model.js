'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const registry = read('project_docs/RESEARCH_REGISTRY.md');
const evidence = read('project_docs/RESEARCH_P1_201_OPTIONAL_HOST_PERMISSION_LIFECYCLE_REFINEMENT_2026-09-11_EVIDENCE.md');
const manifest = JSON.parse(read('manifest.json'));
const worker = read('service-worker.js');
const childSource = read('frame-agent.js');

function receipt(scope, era, documentId) {
  return Object.freeze({ scope, era, documentId });
}

class PermissionLifecycleModel {
  constructor() {
    this.scopes = new Map();
    this.children = new Map();
  }

  ensureScope(scope) {
    if (!this.scopes.has(scope)) {
      this.scopes.set(scope, {
        granted: false,
        era: 0,
        receipt: null,
      });
    }
    return this.scopes.get(scope);
  }

  grant(scope) {
    const state = this.ensureScope(scope);
    state.era += 1;
    state.granted = true;
    state.receipt = Object.freeze({ scope, era: state.era });
    return state.receipt;
  }

  register({ scope, era, frameKey, documentId }) {
    const state = this.ensureScope(scope);
    if (!state.granted || era !== state.era) {
      return { ok: false, reason: 'stale-permission-era' };
    }
    const child = {
      frameKey,
      documentId,
      scope,
      era,
      authority: true,
      permissionStatus: 'active',
      selectionSession: 0,
      selectionRevision: 0,
      selection: [],
      printGeneration: 0,
      printPrepared: false,
      cleanupStatus: 'none',
    };
    this.children.set(frameKey, child);
    return { ok: true, child };
  }

  startSelection(frameKey, era, session) {
    const child = this.children.get(frameKey);
    if (!this.isOrdinaryCurrent(child, era)) return false;
    child.selectionSession = session;
    child.selectionRevision += 1;
    child.selection = [];
    return true;
  }

  setSelection(frameKey, era, session, revision, value) {
    const child = this.children.get(frameKey);
    if (!this.isOrdinaryCurrent(child, era)) return false;
    if (child.selectionSession !== session) return false;
    if (revision <= child.selectionRevision) return false;
    child.selectionRevision = revision;
    child.selection = [...value];
    return true;
  }

  preparePrint(frameKey, era, generation) {
    const child = this.children.get(frameKey);
    if (!this.isOrdinaryCurrent(child, era)) return false;
    if (generation <= child.printGeneration) return false;
    child.printGeneration = generation;
    child.printPrepared = true;
    return true;
  }

  isOrdinaryCurrent(child, era) {
    if (!child || !child.authority || child.permissionStatus !== 'active') return false;
    const state = this.ensureScope(child.scope);
    return state.granted && state.era === era && child.era === era;
  }

  revoke(scope) {
    const state = this.ensureScope(scope);
    if (!state.granted) return { changed: false, era: state.era, cleanup: [] };
    const revokedEra = state.era;
    state.granted = false;
    const cleanup = [];
    for (const child of this.children.values()) {
      if (child.scope !== scope || child.era !== revokedEra) continue;
      child.authority = false;
      child.permissionStatus = 'revoked';
      child.selection = [];
      child.cleanupStatus = 'pending';
      cleanup.push(receipt(scope, revokedEra, child.documentId));
    }
    return { changed: true, era: revokedEra, cleanup };
  }

  settleCleanup(frameKey, cleanupReceipt, settlement, options = {}) {
    const child = this.children.get(frameKey);
    if (!child) return { applied: false, reason: 'unreachable' };
    if (child.documentId !== cleanupReceipt.documentId) {
      return { applied: false, reason: 'document-mismatch' };
    }
    if (child.scope !== cleanupReceipt.scope || child.era !== cleanupReceipt.era) {
      return { applied: false, reason: 'stale-cleanup' };
    }
    if (settlement === 'cleaned') {
      child.cleanupStatus = 'cleaned';
      if (Number.isInteger(options.printGeneration) && options.printGeneration === child.printGeneration) {
        child.printPrepared = false;
      }
      return { applied: true, reason: 'cleaned' };
    }
    if (settlement === 'unreachable') {
      child.cleanupStatus = 'unreachable';
      return { applied: false, reason: 'unreachable' };
    }
    child.cleanupStatus = 'unknown';
    return { applied: false, reason: 'unknown' };
  }

  reconcileGrant({ scope, era, frameKey, documentId }) {
    const state = this.ensureScope(scope);
    if (!state.granted || state.era !== era) return { ok: false, reason: 'not-current-grant' };
    const old = this.children.get(frameKey);
    if (old && old.documentId !== documentId) {
      this.children.delete(frameKey);
    }
    const child = {
      frameKey,
      documentId,
      scope,
      era,
      authority: true,
      permissionStatus: 'active',
      selectionSession: 0,
      selectionRevision: 0,
      selection: [],
      printGeneration: 0,
      printPrepared: false,
      cleanupStatus: 'none',
    };
    this.children.set(frameKey, child);
    return { ok: true, child };
  }
}

function cleanupCapabilityAllows(command) {
  return new Set([
    'permission-revoke-cleanup',
  ]).has(command);
}

function testCurrentShapeNeedsEventDrivenClose() {
  const currentShape = {
    browserGranted: false,
    registryStillPresentUntilNextCheck: true,
    topSnapshotStillPresentUntilNotification: true,
  };
  assert.equal(currentShape.browserGranted, false);
  assert.equal(currentShape.registryStillPresentUntilNextCheck, true);
  assert.equal(currentShape.topSnapshotStillPresentUntilNotification, true);
}

function testRevokeImmediatelyClosesAuthority() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  assert(m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' }).ok);
  assert(m.startSelection('f1', A.era, 1));
  const r = m.revoke(A.scope);
  assert.equal(r.changed, true);
  assert.equal(m.children.get('f1').authority, false);
  assert.equal(m.children.get('f1').permissionStatus, 'revoked');
  assert.deepEqual(m.children.get('f1').selection, []);
}

function testOldStateRejectedAfterRevoke() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
  m.startSelection('f1', A.era, 3);
  m.revoke(A.scope);
  assert.equal(m.setSelection('f1', A.era, 3, 2, ['stale']), false);
}

function testUnknownAndUnreachableCleanupStayRevoked() {
  for (const settlement of ['unknown', 'unreachable']) {
    const m = new PermissionLifecycleModel();
    const A = m.grant('https://child.example/*');
    m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
    const revoke = m.revoke(A.scope);
    assert.equal(revoke.cleanup.length, 1);
    m.settleCleanup('f1', revoke.cleanup[0], settlement);
    assert.equal(m.ensureScope(A.scope).granted, false);
    assert.equal(m.children.get('f1').authority, false);
  }
}

function testCleanupCapabilityIsNarrow() {
  assert(cleanupCapabilityAllows('permission-revoke-cleanup'));
  for (const forbidden of ['start', 'set-mode', 'restore', 'get-state', 'prepare-print', 'read-content']) {
    assert.equal(cleanupCapabilityAllows(forbidden), false, forbidden);
  }
}

function testRegrantCreatesFreshEra() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
  m.revoke(A.scope);
  const B = m.grant(A.scope);
  assert(B.era > A.era);
  assert.equal(m.register({ scope: A.scope, era: A.era, frameKey: 'stale', documentId: 'doc-A' }).ok, false);
  assert(m.reconcileGrant({ scope: B.scope, era: B.era, frameKey: 'f1', documentId: 'doc-A' }).ok);
  assert.equal(m.children.get('f1').era, B.era);
  assert.deepEqual(m.children.get('f1').selection, []);
}

function testStaleAStateCannotBecomeB() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
  m.revoke(A.scope);
  const B = m.grant(A.scope);
  m.reconcileGrant({ scope: B.scope, era: B.era, frameKey: 'f1', documentId: 'doc-A' });
  m.startSelection('f1', B.era, 9);
  assert.equal(m.setSelection('f1', A.era, 9, 50, ['old-A']), false);
  assert(m.setSelection('f1', B.era, 9, 2, ['new-B']));
  assert.deepEqual(m.children.get('f1').selection, ['new-B']);
}

function testLateCleanupADoesNotEraseB() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
  m.preparePrint('f1', A.era, 5);
  const revoke = m.revoke(A.scope);
  const oldCleanup = revoke.cleanup[0];
  const B = m.grant(A.scope);
  m.reconcileGrant({ scope: B.scope, era: B.era, frameKey: 'f1', documentId: 'doc-A' });
  m.preparePrint('f1', B.era, 1);
  const late = m.settleCleanup('f1', oldCleanup, 'cleaned', { printGeneration: 5 });
  assert.equal(late.applied, false);
  assert.equal(late.reason, 'stale-cleanup');
  assert.equal(m.children.get('f1').printPrepared, true);
}

function testUnrelatedOriginUnaffected() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://a.example/*');
  const B = m.grant('https://b.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'fa', documentId: 'doc-a' });
  m.register({ scope: B.scope, era: B.era, frameKey: 'fb', documentId: 'doc-b' });
  m.revoke(A.scope);
  assert.equal(m.children.get('fa').authority, false);
  assert.equal(m.children.get('fb').authority, true);
  assert.equal(m.ensureScope(B.scope).granted, true);
}

function testRevokeDuringPrintUsesExactOldGeneration() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
  assert(m.preparePrint('f1', A.era, 7));
  const revoke = m.revoke(A.scope);
  const receiptA = revoke.cleanup[0];
  const wrong = m.settleCleanup('f1', receiptA, 'cleaned', { printGeneration: 6 });
  assert.equal(wrong.applied, true);
  assert.equal(m.children.get('f1').printPrepared, true);
  const exact = m.settleCleanup('f1', receiptA, 'cleaned', { printGeneration: 7 });
  assert.equal(exact.applied, true);
  assert.equal(m.children.get('f1').printPrepared, false);
  assert.equal(m.children.get('f1').authority, false);
}

function testChildReplacementRejectsOldCleanup() {
  const m = new PermissionLifecycleModel();
  const A = m.grant('https://child.example/*');
  m.register({ scope: A.scope, era: A.era, frameKey: 'f1', documentId: 'doc-A' });
  const revoke = m.revoke(A.scope);
  const cleanupA = revoke.cleanup[0];
  const B = m.grant(A.scope);
  m.reconcileGrant({ scope: B.scope, era: B.era, frameKey: 'f1', documentId: 'doc-B' });
  const result = m.settleCleanup('f1', cleanupA, 'cleaned');
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'document-mismatch');
  assert.equal(m.children.get('f1').documentId, 'doc-B');
}

function testRestartCannotInferChildAuthorityFromBooleanGrant() {
  const browser = { granted: true };
  const restartedWorker = { registry: new Map(), freshHandshakeComplete: false };
  assert.equal(browser.granted, true);
  assert.equal(restartedWorker.registry.size, 0);
  assert.equal(restartedWorker.freshHandshakeComplete, false);
  assert.equal(browser.granted && restartedWorker.freshHandshakeComplete, false);
}

function testIdentityDomainsAreDistinct() {
  const domains = {
    permissionEra: 4,
    documentId: 'doc-9',
    selectionSession: 12,
    selectionCommandSeq: 31,
    selectionStateRevision: 44,
    printGeneration: 8,
  };
  assert.equal(new Set(Object.values(domains)).size, Object.values(domains).length);
}

function testSourceBoundCurrentGap() {
  assert.match(registry, /\| P1-201 \| ACTIVE \| Optional host-permission revoke\/regrant must clean\/fence already injected frame-agent authority and never revive old session state\. \|/);
  assert.match(worker, /chrome\.permissions\.contains\(\{ origins: \[pattern\] \}\)/);
  assert.match(worker, /Frame-agent не зарегистрирован, устарел после навигации или permission отозван\./);
  assert.match(worker, /Host permission для iframe отсутствует или был отозван\./);
  assert(!worker.includes('chrome.permissions.onRemoved.addListener'));
  assert(!worker.includes('chrome.permissions.onAdded.addListener'));
  assert.match(childSource, /__WEBCLIP_FRAME_AGENT_LOADED__/);
  assert.match(childSource, /phase:'idle'.*mode:'include'.*includes:new Map\(\).*excludes:new Map\(\)/s);
  assert(!childSource.includes('permissionEra'));
  assert(!childSource.includes('permissionGeneration'));
}

function testEvidenceContractAndReleaseFence() {
  assert.match(evidence, /Canonical baseline inspected: `main@d813e25bfa3ef952293899284247308c66e80dea`/);
  assert.match(evidence, /cleaned \| unreachable \| unknown/);
  assert.match(evidence, /P1-193 owns/);
  assert.match(evidence, /P1-171 owns/);
  assert.match(evidence, /P1-200 owns/);
  assert.match(evidence, /P1-199 owns/);
  assert.match(evidence, /P1-203 owns/);
  assert.match(evidence, /P1-214 owns/);
  assert.match(evidence, /EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION/);
  assert.equal(manifest.version, '0.9.8');
  assert(!registry.includes('| P1-232 |'));
}

const tests = [
  testCurrentShapeNeedsEventDrivenClose,
  testRevokeImmediatelyClosesAuthority,
  testOldStateRejectedAfterRevoke,
  testUnknownAndUnreachableCleanupStayRevoked,
  testCleanupCapabilityIsNarrow,
  testRegrantCreatesFreshEra,
  testStaleAStateCannotBecomeB,
  testLateCleanupADoesNotEraseB,
  testUnrelatedOriginUnaffected,
  testRevokeDuringPrintUsesExactOldGeneration,
  testChildReplacementRejectsOldCleanup,
  testRestartCannotInferChildAuthorityFromBooleanGrant,
  testIdentityDomainsAreDistinct,
  testSourceBoundCurrentGap,
  testEvidenceContractAndReleaseFence,
];

for (const test of tests) test();

console.log(`P1-201 optional host-permission lifecycle refinement model: ${tests.length} checks PASS`);
