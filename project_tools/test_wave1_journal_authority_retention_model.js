'use strict';
const assert = require('assert');
let cases = 0;
const ok = (value, message) => { assert.ok(value, message); cases += 1; };
const eq = (a, b, message) => { assert.deepStrictEqual(a, b, message); cases += 1; };

const DAY = 24 * 60 * 60 * 1000;
const NORMAL_RETENTION = 30 * DAY;
const PRESSURE_FLOOR = 1 * DAY;
const MANUAL_RETENTION = 90 * DAY;
const ACTIVE_F_CAP = 256;
const ACTIVE_E_CAP = 128;

const unresolvedE = new Set(['prepared', 'started-unknown', 'verified']);
const terminalE = new Set(['canceled-before-start', 'local-finalized', 'remote-complete-local-suppressed']);

function domainGcEligible({ now, F, Es, P, pressure = false }) {
  if (!F || !P) return false;
  if (!['revoked', 'finalized', 'expired'].includes(F.state)) return false;
  if (!P.terminal || !P.terminalSummaryArchived) return false;

  for (const E of Es) {
    if (unresolvedE.has(E.phase)) return false;
    if (E.phase === 'manual-resolution') {
      if (now - (E.manualAt || E.updatedAt) < MANUAL_RETENTION) return false;
    } else if (!terminalE.has(E.phase)) {
      return false;
    }
  }

  const age = now - Math.max(
    F.terminalAt || F.updatedAt || 0,
    ...Es.map((E) => E.terminalAt || E.updatedAt || 0)
  );
  return age >= (pressure ? PRESSURE_FLOOR : NORMAL_RETENTION);
}

function operationReceiptGcEligible({ now, P, domainRowsRemain }) {
  if (!P?.terminal || domainRowsRemain) return false;
  return now - (P.terminalAt || 0) >= NORMAL_RETENTION;
}

function canAdmitF(activeCount) {
  return activeCount < ACTIVE_F_CAP;
}

function canAdmitE(activeCount) {
  return activeCount < ACTIVE_E_CAP;
}

function staleUnknownTransition(E, now, { staleAfter = DAY, minAttempts = 6 } = {}) {
  if (E.phase !== 'started-unknown') return E;
  if (now - (E.updatedAt || 0) < staleAfter) return E;
  if ((E.attemptCount || 0) < minAttempts) return E;
  return { ...E, phase: 'manual-resolution', manualAt: now, updatedAt: now };
}

function revokePrepared(F, E, now) {
  const nextF = { ...F, state: 'revoked', terminalAt: now, updatedAt: now };
  if (E?.phase === 'prepared') {
    return {
      F: nextF,
      E: { ...E, phase: 'canceled-before-start', terminalAt: now, updatedAt: now }
    };
  }
  return { F: nextF, E };
}

function recoveryPriority(E) {
  if (E.phase === 'verified') return 0;
  if (E.phase === 'started-unknown') return 1;
  if (E.phase === 'prepared') return 2;
  if (E.phase === 'manual-resolution') return 9;
  return 10;
}

const now = 200 * DAY;
const P = {
  id: 'P1',
  terminal: true,
  terminalAt: 100 * DAY,
  terminalSummaryArchived: true
};
const Ffinal = {
  id: 'F1',
  state: 'finalized',
  terminalAt: 100 * DAY,
  updatedAt: 100 * DAY
};
const Efinal = {
  id: 'E1',
  phase: 'local-finalized',
  terminalAt: 100 * DAY,
  updatedAt: 100 * DAY
};

ok(domainGcEligible({ now, F: Ffinal, Es: [Efinal], P }), 'old terminal domain pair eligible');
ok(!domainGcEligible({ now: 110 * DAY, F: Ffinal, Es: [Efinal], P }), 'normal retention respected');
ok(domainGcEligible({ now: 102 * DAY, F: Ffinal, Es: [Efinal], P, pressure: true }), 'pressure may collect after floor');
ok(!domainGcEligible({ now, F: { ...Ffinal, state: 'admitted' }, Es: [Efinal], P }), 'admitted F never GC');
ok(!domainGcEligible({ now, F: Ffinal, Es: [{ ...Efinal, phase: 'started-unknown' }], P }), 'unknown E never GC');
ok(!domainGcEligible({ now, F: Ffinal, Es: [{ ...Efinal, phase: 'verified' }], P }), 'verified-but-local-pending never GC');
ok(!domainGcEligible({ now, F: Ffinal, Es: [Efinal], P: { ...P, terminal: false } }), 'P must be terminal');
ok(!domainGcEligible({ now, F: Ffinal, Es: [Efinal], P: { ...P, terminalSummaryArchived: false } }), 'P terminal summary required before domain deletion');
ok(!domainGcEligible({ now, F: null, Es: [Efinal], P }), 'missing F blocks pair GC');
ok(!domainGcEligible({ now, F: Ffinal, Es: [Efinal], P: null }), 'missing P blocks GC');

const manualRecent = {
  id: 'E2', phase: 'manual-resolution', manualAt: 150 * DAY, updatedAt: 150 * DAY
};
ok(!domainGcEligible({ now, F: Ffinal, Es: [manualRecent], P }), 'manual-resolution gets longer retention');
const manualOld = { ...manualRecent, manualAt: 90 * DAY, updatedAt: 90 * DAY };
ok(domainGcEligible({ now, F: Ffinal, Es: [manualOld], P }), 'old manual-resolution eventually bounded');

ok(!operationReceiptGcEligible({ now, P, domainRowsRemain: true }), 'common P retained while domain rows remain');
ok(operationReceiptGcEligible({ now, P, domainRowsRemain: false }), 'common P may GC after domain rows removed and retention');
ok(!operationReceiptGcEligible({ now: 110 * DAY, P, domainRowsRemain: false }), 'common P normal retention respected');

ok(canAdmitF(255), 'F below cap admits');
ok(!canAdmitF(256), 'F cap fails new admission rather than evict unresolved');
ok(canAdmitE(127), 'E below cap admits');
ok(!canAdmitE(128), 'E cap fails before remote effect');

let unknown = {
  id: 'E3',
  phase: 'started-unknown',
  updatedAt: 190 * DAY,
  attemptCount: 5,
  source: { resourceId: 'R' },
  targetPath: '/T'
};
eq(staleUnknownTransition(unknown, now), unknown, 'unknown below min attempts stays unknown');
unknown = { ...unknown, attemptCount: 6 };
const manual = staleUnknownTransition(unknown, now);
ok(manual.phase === 'manual-resolution', 'stale unknown transitions to manual instead of deletion');
ok(manual.source.resourceId === 'R' && manual.targetPath === '/T', 'manual transition preserves exact evidence');

const prepared = { id: 'E4', phase: 'prepared', updatedAt: now };
const revoked = revokePrepared({ id: 'F4', state: 'admitted', updatedAt: now }, prepared, now);
ok(revoked.F.state === 'revoked', 'F revoked');
ok(revoked.E.phase === 'canceled-before-start', 'prepared E gets exact canceled-before-start terminal state');

const started = revokePrepared(
  { id: 'F5', state: 'admitted', updatedAt: now },
  { id: 'E5', phase: 'started-unknown', updatedAt: now },
  now
);
ok(started.E.phase === 'started-unknown', 'revocation never rewrites started effect as canceled');

const order = [
  { id: 'old-prepared', phase: 'prepared', updatedAt: 1 },
  { id: 'unknown', phase: 'started-unknown', updatedAt: 3 },
  { id: 'verified-new', phase: 'verified', updatedAt: 5 },
  { id: 'verified-old', phase: 'verified', updatedAt: 2 },
  { id: 'manual', phase: 'manual-resolution', updatedAt: 0 }
].sort((a, b) => recoveryPriority(a) - recoveryPriority(b) || a.updatedAt - b.updatedAt)
  .map((item) => item.id);
eq(order, ['verified-old', 'verified-new', 'unknown', 'old-prepared', 'manual'], 'verified local finalization cannot starve behind auth/network work');

function maintenanceAction(E) {
  if (E.phase === 'verified') return 'finalize-local';
  if (E.phase === 'started-unknown') return 'reconcile-read-only';
  if (E.phase === 'prepared') return 'do-not-start-effect';
  if (E.phase === 'manual-resolution') return 'manual';
  return 'none';
}

eq(maintenanceAction({ phase: 'prepared' }), 'do-not-start-effect', 'maintenance does not invent destructive user mutation');
eq(maintenanceAction({ phase: 'started-unknown' }), 'reconcile-read-only', 'unknown gets read-only/provider reconciliation');
eq(maintenanceAction({ phase: 'verified' }), 'finalize-local', 'verified gets cheap local finalization');

function maybeExpireF(F, { P: operation, effects, exactNoEffectProof, now: current }) {
  if (F.state !== 'admitted') return F;
  if (!operation.terminal || !exactNoEffectProof || effects.some((E) => E.phase === 'started-unknown' || E.phase === 'verified')) {
    return F;
  }
  return { ...F, state: 'expired', terminalAt: current, updatedAt: current };
}

const oldF = { id: 'F6', state: 'admitted', createdAt: 1, updatedAt: 1 };
eq(maybeExpireF(oldF, { P: { terminal: false }, effects: [], exactNoEffectProof: true, now }), oldF, 'age/no terminal P cannot expire F');
eq(maybeExpireF(oldF, { P: { terminal: true }, effects: [], exactNoEffectProof: false, now }), oldF, 'terminal P without no-effect proof cannot expire F');
const expired = maybeExpireF(oldF, { P: { terminal: true }, effects: [], exactNoEffectProof: true, now });
ok(expired.state === 'expired', 'exact no-effect proof may terminalize abandoned F');

function atomicDomainDelete(state, shouldAbort) {
  const next = { F: new Map(state.F), E: new Map(state.E) };
  next.E.delete('E1');
  next.F.delete('F1');
  return shouldAbort ? state : next;
}

const state = {
  F: new Map([['F1', Ffinal]]),
  E: new Map([['E1', Efinal]])
};
let after = atomicDomainDelete(state, true);
ok(after.F.has('F1') && after.E.has('E1'), 'aborted GC leaves both rows');
after = atomicDomainDelete(state, false);
ok(!after.F.has('F1') && !after.E.has('E1'), 'committed GC deletes pair atomically');

function reconcile(operation, domainPresent) {
  if (!operation) return 'not-admitted';
  if (domainPresent) return operation.terminal ? 'terminal-from-domain-or-summary' : 'pending';
  if (operation.terminalSummaryArchived) return operation.terminalClass || 'terminal-summary';
  return 'evidence-limited';
}

eq(reconcile({ ...P, terminalClass: 'settled-partial' }, false), 'settled-partial', 'domain GC preserves terminal truth via P summary');
eq(reconcile(null, false), 'not-admitted', 'only true P absence can be not-admitted');

console.log(`Wave 1 Journal authority retention/GC model: PASS cases=${cases}`);
