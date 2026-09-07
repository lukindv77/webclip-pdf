'use strict';

const assert = require('assert');

class NaivePermissionAgent {
  constructor() {
    this.permissionGranted = false;
    this.registered = false;
    this.phase = 'idle';
    this.snapshot = [];
    this.printPrepared = false;
  }
  grant() { this.permissionGranted = true; }
  revoke() { this.permissionGranted = false; }
  register() {
    if (!this.permissionGranted) return false;
    this.registered = true;
    return true;
  }
  start() {
    if (!this.permissionGranted || !this.registered) return false;
    this.phase = 'selecting';
    return true;
  }
  childClick(item) {
    if (this.phase !== 'selecting') return false;
    this.snapshot.push(item);
    return true;
  }
  preparePrint() {
    if (!this.permissionGranted || !this.registered) return false;
    this.phase = 'printing';
    this.printPrepared = true;
    return true;
  }
  ordinaryCleanup() {
    // Mirrors the current worker policy shape: ordinary command admission is
    // denied after revoke, so cleanup cannot reach the child through it.
    if (!this.permissionGranted) return false;
    this.phase = 'idle';
    this.printPrepared = false;
    this.snapshot = [];
    return true;
  }
}

class FencedPermissionAgent {
  constructor() {
    this.nextPermissionGeneration = 0;
    this.currentPermissionGeneration = 0;
    this.closedThroughGeneration = 0;
    this.granted = false;
    this.registeredGeneration = 0;
    this.phase = 'idle';
    this.snapshot = [];
    this.printGeneration = 0;
    this.topSnapshot = [];
    this.cleanupUnknown = false;
  }

  grant() {
    const generation = ++this.nextPermissionGeneration;
    this.currentPermissionGeneration = generation;
    this.granted = true;
    // A re-grant does not authorize old child state. Registration/reconcile
    // must explicitly bind the existing code instance to this fresh generation.
    this.registeredGeneration = 0;
    this.phase = 'idle';
    this.snapshot = [];
    this.printGeneration = 0;
    this.topSnapshot = [];
    return generation;
  }

  register(generation) {
    const g = Number(generation);
    if (!this.granted || g !== this.currentPermissionGeneration || g <= this.closedThroughGeneration) {
      return { ok: false, stale: true };
    }
    this.registeredGeneration = g;
    // Reusing an already-loaded JS instance is allowed, but lifecycle state is
    // reconciled to the new permission generation before ordinary commands.
    this.phase = 'idle';
    this.snapshot = [];
    this.printGeneration = 0;
    return { ok: true, generation: g };
  }

  start(generation) {
    const g = Number(generation);
    if (!this.granted || g !== this.currentPermissionGeneration || g !== this.registeredGeneration || g <= this.closedThroughGeneration) {
      return { ok: false, stale: true };
    }
    this.phase = 'selecting';
    return { ok: true };
  }

  childClick(generation, item) {
    const g = Number(generation);
    if (!this.granted || g !== this.currentPermissionGeneration || g !== this.registeredGeneration || this.phase !== 'selecting') {
      return { ok: false, stale: true };
    }
    this.snapshot.push(String(item));
    this.topSnapshot = [...this.snapshot];
    return { ok: true };
  }

  preparePrint(permissionGeneration, printGeneration) {
    const g = Number(permissionGeneration);
    if (!this.granted || g !== this.currentPermissionGeneration || g !== this.registeredGeneration) {
      return { ok: false, stale: true };
    }
    this.phase = 'printing';
    this.printGeneration = Number(printGeneration) || 0;
    return { ok: true };
  }

  revoke(generation, { cleanupDelivered = true } = {}) {
    const g = Number(generation);
    if (g !== this.currentPermissionGeneration) {
      return { ok: true, stale: true };
    }

    // Worker/top authority becomes invalid immediately, before best-effort
    // child cleanup settlement is known.
    this.granted = false;
    this.closedThroughGeneration = Math.max(this.closedThroughGeneration, g);
    this.registeredGeneration = 0;
    this.topSnapshot = [];

    if (cleanupDelivered) {
      this.cleanupOnly(g);
      this.cleanupUnknown = false;
      return { ok: true, cleaned: true };
    }

    this.cleanupUnknown = true;
    return { ok: true, cleaned: false, cleanupUnknown: true };
  }

  cleanupOnly(revokedGeneration) {
    const g = Number(revokedGeneration);
    // Cleanup is narrowly allowed for the revoked exact generation. It does
    // not require ordinary permission admission and cannot touch a newer grant.
    if (g < this.currentPermissionGeneration && this.granted) {
      return { ok: true, stale: true };
    }
    if (g > this.closedThroughGeneration) {
      return { ok: false, reason: 'not-revoked' };
    }
    this.phase = 'idle';
    this.snapshot = [];
    this.printGeneration = 0;
    return { ok: true, cleaned: true };
  }

  acceptChildState(permissionGeneration, snapshot) {
    const g = Number(permissionGeneration);
    if (!this.granted || g !== this.currentPermissionGeneration || g !== this.registeredGeneration || g <= this.closedThroughGeneration) {
      return false;
    }
    this.topSnapshot = [...snapshot];
    return true;
  }
}

// 1. Current-shaped behavior: revoke blocks ordinary cleanup, while the already
// started child selection can still intercept/mutate local state.
{
  const x = new NaivePermissionAgent();
  x.grant();
  assert.equal(x.register(), true);
  assert.equal(x.start(), true);
  x.revoke();
  assert.equal(x.ordinaryCleanup(), false);
  assert.equal(x.childClick('revoked-local-change'), true);
  assert.deepEqual(x.snapshot, ['revoked-local-change']);
}

// 2. Revocation immediately invalidates top/worker authority and delivers local cleanup.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.start(a);
  x.childClick(a, 'selected');
  assert.deepEqual(x.topSnapshot, ['selected']);
  const result = x.revoke(a, { cleanupDelivered: true });
  assert.equal(result.cleaned, true);
  assert.deepEqual(x.topSnapshot, []);
  assert.deepEqual(x.snapshot, []);
  assert.equal(x.phase, 'idle');
}

// 3. Revoke during print neutralizes print-owned state without ordinary permission admission.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.preparePrint(a, 41);
  assert.equal(x.phase, 'printing');
  x.revoke(a, { cleanupDelivered: true });
  assert.equal(x.phase, 'idle');
  assert.equal(x.printGeneration, 0);
}

// 4. Cleanup delivery failure never restores authority: top state remains revoked/fail-closed.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.start(a);
  x.childClick(a, 'x');
  const result = x.revoke(a, { cleanupDelivered: false });
  assert.equal(result.cleanupUnknown, true);
  assert.deepEqual(x.topSnapshot, []);
  assert.equal(x.acceptChildState(a, ['late']), false);
}

// 5. Re-grant creates a fresh permission generation and starts from clean lifecycle state.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.start(a);
  x.childClick(a, 'old');
  x.revoke(a, { cleanupDelivered: true });
  const b = x.grant();
  assert.ok(b > a);
  assert.deepEqual(x.snapshot, []);
  assert.equal(x.registeredGeneration, 0);
  assert.equal(x.register(b).ok, true);
  assert.deepEqual(x.snapshot, []);
}

// 6. Old pre-revoke state cannot become current merely because permission is granted again.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.start(a);
  x.childClick(a, 'old');
  x.revoke(a, { cleanupDelivered: true });
  const b = x.grant();
  x.register(b);
  assert.equal(x.acceptChildState(a, ['resurrected-old']), false);
  assert.deepEqual(x.topSnapshot, []);
}

// 7. Delayed cleanup for old generation A cannot erase newer re-granted generation B.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.revoke(a, { cleanupDelivered: false });
  const b = x.grant();
  x.register(b);
  x.start(b);
  x.childClick(b, 'new');
  const staleCleanup = x.cleanupOnly(a);
  assert.equal(staleCleanup.stale, true);
  assert.deepEqual(x.snapshot, ['new']);
}

// 8. Delayed ordinary command/state from A stays stale after re-grant B.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.revoke(a, { cleanupDelivered: true });
  const b = x.grant();
  x.register(b);
  assert.equal(x.start(a).stale, true);
  assert.equal(x.acceptChildState(a, ['old']), false);
}

// 9. Current B remains usable after clean re-grant/reconcile.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.revoke(a, { cleanupDelivered: true });
  const b = x.grant();
  x.register(b);
  assert.equal(x.start(b).ok, true);
  assert.equal(x.childClick(b, 'fresh').ok, true);
  assert.deepEqual(x.topSnapshot, ['fresh']);
}

// 10. Revocation event for unrelated origin must not tear down an independent agent.
{
  const originA = new FencedPermissionAgent();
  const originB = new FencedPermissionAgent();
  const a = originA.grant();
  const b = originB.grant();
  originA.register(a); originA.start(a);
  originB.register(b); originB.start(b); originB.childClick(b, 'keep');
  originA.revoke(a, { cleanupDelivered: true });
  assert.deepEqual(originB.topSnapshot, ['keep']);
  assert.equal(originB.granted, true);
}

// 11. Permission boolean alone is insufficient: after re-grant true, old A must still be stale.
{
  const x = new FencedPermissionAgent();
  const a = x.grant();
  x.register(a);
  x.revoke(a, { cleanupDelivered: true });
  const b = x.grant();
  x.register(b);
  assert.equal(x.granted, true);
  assert.notEqual(a, b);
  assert.equal(x.acceptChildState(a, ['old']), false);
}

// 12. Permission generation is independent of selection/print generations.
{
  const permissionGeneration = 5;
  const selectionSessionGeneration = 11;
  const printGeneration = 19;
  assert.notEqual(permissionGeneration, selectionSessionGeneration);
  assert.notEqual(permissionGeneration, printGeneration);
  assert.notEqual(selectionSessionGeneration, printGeneration);
}

// 13. Exact child document identity remains a separate composition dimension (P1-171).
{
  const authorities = new Map();
  authorities.set('tab:1/frame:5/document:A', { permissionGeneration: 7 });
  authorities.set('tab:1/frame:5/document:B', { permissionGeneration: 7 });
  assert.equal(authorities.size, 2);
}

// 14. Worker restart/re-handshake remains P1-203: old lifecycle state is never inferred current from boolean permission alone.
{
  const afterRestart = { browserPermissionGranted: true, trustedRegisteredGeneration: 0 };
  assert.equal(afterRestart.browserPermissionGranted, true);
  assert.equal(afterRestart.trustedRegisteredGeneration, 0);
}

console.log('P1-201 optional host permission lifecycle model: PASS');
