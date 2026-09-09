'use strict';
const assert = require('assert');
let cases = 0;
const ok = (v, m) => { assert.ok(v, m); cases += 1; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); cases += 1; };

class SerialStore {
  constructor() { this.rows = new Map(); }
  snapshot() { return [...this.rows.values()].map((x) => ({ ...x })); }
  async readwrite(task) {
    const previous = this._tail || Promise.resolve();
    let release;
    const turn = new Promise((r) => { release = r; });
    this._tail = turn;
    await previous;
    const tx = {
      values: () => this.snapshot(),
      add: (row) => {
        if (this.rows.has(row.id)) throw new Error('ConstraintError');
        this.rows.set(row.id, { ...row });
      },
      put: (row) => this.rows.set(row.id, { ...row }),
      get: (id) => this.rows.get(id) ? { ...this.rows.get(id) } : null
    };
    try { return await task(tx); }
    finally { release(); }
  }
}

const F_ACTIVE = new Set(['admitted']);
const E_ACTIVE = new Set(['prepared', 'started-unknown', 'verified']);

function countWhere(rows, predicate) { return rows.reduce((n, r) => n + (predicate(r) ? 1 : 0), 0); }

async function admitF(store, row, { activeCap = 2, totalCap = 4 } = {}) {
  return store.readwrite(async (tx) => {
    const rows = tx.values();
    const active = countWhere(rows, (r) => F_ACTIVE.has(r.state));
    const total = rows.length;
    if (active >= activeCap) return { ok: false, code: 'F_ACTIVE_CAPACITY', active, total };
    if (total >= totalCap) return { ok: false, code: 'F_TOTAL_CAPACITY', active, total };
    tx.add(row);
    return { ok: true, activeBefore: active, totalBefore: total };
  });
}

async function admitE(store, row, { activeCap = 2, totalCap = 4 } = {}) {
  return store.readwrite(async (tx) => {
    const rows = tx.values();
    const active = countWhere(rows, (r) => E_ACTIVE.has(r.phase));
    const total = rows.length;
    if (active >= activeCap) return { ok: false, code: 'E_ACTIVE_CAPACITY', active, total };
    if (total >= totalCap) return { ok: false, code: 'E_TOTAL_CAPACITY', active, total };
    tx.add(row);
    return { ok: true, activeBefore: active, totalBefore: total };
  });
}

(async () => {
  const f = new SerialStore();
  let r = await admitF(f, { id: 'F1', state: 'admitted' });
  ok(r.ok, 'first F admitted');
  r = await admitF(f, { id: 'F2', state: 'admitted' });
  ok(r.ok, 'second F admitted');
  r = await admitF(f, { id: 'F3', state: 'admitted' });
  eq(r.code, 'F_ACTIVE_CAPACITY', 'F active cap rejects before insert');
  eq(f.rows.size, 2, 'rejected F not inserted');

  const e = new SerialStore();
  ok((await admitE(e, { id: 'E1', phase: 'prepared' })).ok, 'first E admitted');
  ok((await admitE(e, { id: 'E2', phase: 'verified' })).ok, 'verified is active capacity');
  eq((await admitE(e, { id: 'E3', phase: 'prepared' })).code, 'E_ACTIVE_CAPACITY', 'E active cap rejects');
  eq(e.rows.size, 2, 'rejected E absent');

  // Concurrent cap-1 schedule: overlapping readwrite scopes serialize.
  const concurrent = new SerialStore();
  await admitE(concurrent, { id: 'seed', phase: 'prepared' }, { activeCap: 2, totalCap: 10 });
  const [a, b] = await Promise.all([
    admitE(concurrent, { id: 'A', phase: 'prepared' }, { activeCap: 2, totalCap: 10 }),
    admitE(concurrent, { id: 'B', phase: 'prepared' }, { activeCap: 2, totalCap: 10 })
  ]);
  eq([a.ok, b.ok].filter(Boolean).length, 1, 'only one concurrent admission wins last active slot');
  eq(concurrent.snapshot().filter((x) => E_ACTIVE.has(x.phase)).length, 2, 'active cap remains exact');

  // Terminal rows do not consume active cap but do consume total cap.
  const total = new SerialStore();
  await total.readwrite(async (tx) => {
    tx.add({ id: 'T1', phase: 'local-finalized' });
    tx.add({ id: 'T2', phase: 'canceled-before-start' });
    tx.add({ id: 'M1', phase: 'manual-resolution' });
  });
  ok((await admitE(total, { id: 'E4', phase: 'prepared' }, { activeCap: 2, totalCap: 4 })).ok,
    'terminal/manual rows do not consume active slot');
  eq((await admitE(total, { id: 'E5', phase: 'prepared' }, { activeCap: 2, totalCap: 4 })).code,
    'E_TOTAL_CAPACITY', 'total cap still bounds retained evidence');

  // Transition to terminal releases active capacity only through a committed store update.
  await total.readwrite(async (tx) => {
    const row = tx.get('E4');
    tx.put({ ...row, phase: 'local-finalized' });
  });
  eq(countWhere(total.snapshot(), (x) => E_ACTIVE.has(x.phase)), 0, 'terminal transition releases active slot');

  // E admission must validate exact F in the same Journal DB transaction scope.
  const finalizations = new SerialStore();
  await finalizations.readwrite(async (tx) => tx.add({ id: 'F-valid', state: 'admitted', P: 'P1' }));
  async function admitEffectWithF(eStore, fStore, row, expectedF, caps) {
    // Model a single IndexedDB readwrite transaction spanning both stores by
    // serializing through a shared coordinator; production uses one tx with
    // scope [journalFinalizations, pendingRemoteMutations].
    const previous = admitEffectWithF._tail || Promise.resolve();
    let release;
    const turn = new Promise((resolve) => { release = resolve; });
    admitEffectWithF._tail = turn;
    await previous;
    try {
      const fRow = fStore.rows.get(expectedF.id);
      if (!fRow || fRow.state !== 'admitted' || fRow.P !== expectedF.P) {
        return { ok: false, code: 'F_STALE' };
      }
      const rows = eStore.snapshot();
      const active = countWhere(rows, (x) => E_ACTIVE.has(x.phase));
      if (active >= caps.activeCap) return { ok: false, code: 'E_ACTIVE_CAPACITY' };
      if (rows.length >= caps.totalCap) return { ok: false, code: 'E_TOTAL_CAPACITY' };
      eStore.rows.set(row.id, { ...row });
      return { ok: true };
    } finally { release(); }
  }

  const effects = new SerialStore();
  ok((await admitEffectWithF(effects, finalizations, { id: 'E-F1', phase: 'prepared' },
    { id: 'F-valid', P: 'P1' }, { activeCap: 2, totalCap: 4 })).ok, 'E admitted with exact active F');
  await finalizations.readwrite(async (tx) => {
    const x = tx.get('F-valid');
    tx.put({ ...x, state: 'revoked' });
  });
  eq((await admitEffectWithF(effects, finalizations, { id: 'E-F2', phase: 'prepared' },
    { id: 'F-valid', P: 'P1' }, { activeCap: 2, totalCap: 4 })).code, 'F_STALE', 'revoked F blocks E before effect');
  ok(!effects.rows.has('E-F2'), 'no E created from stale F');

  // Effect-start boundary must re-check F and E in one tx before remote call.
  async function markStarted(eStore, fStore, eId, expectedF) {
    const fRow = fStore.rows.get(expectedF.id);
    const eRow = eStore.rows.get(eId);
    if (!fRow || fRow.state !== 'admitted' || fRow.P !== expectedF.P) return { ok: false, code: 'F_STALE' };
    if (!eRow || eRow.phase !== 'prepared') return { ok: false, code: 'E_STALE' };
    eStore.rows.set(eId, { ...eRow, phase: 'started-unknown' });
    return { ok: true };
  }

  const f2 = new SerialStore();
  const e2 = new SerialStore();
  await f2.readwrite(async (tx) => tx.add({ id: 'F2', state: 'admitted', P: 'P2' }));
  await e2.readwrite(async (tx) => tx.add({ id: 'E2', phase: 'prepared', P: 'P2', F: 'F2' }));
  ok((await markStarted(e2, f2, 'E2', { id: 'F2', P: 'P2' })).ok, 'prepared E can cross effect-start after exact recheck');
  eq(e2.rows.get('E2').phase, 'started-unknown', 'started-unknown durable before remote call');

  const f3 = new SerialStore();
  const e3 = new SerialStore();
  await f3.readwrite(async (tx) => tx.add({ id: 'F3', state: 'revoked', P: 'P3' }));
  await e3.readwrite(async (tx) => tx.add({ id: 'E3', phase: 'prepared', P: 'P3', F: 'F3' }));
  eq((await markStarted(e3, f3, 'E3', { id: 'F3', P: 'P3' })).code, 'F_STALE', 'revocation wins before effect-start');
  eq(e3.rows.get('E3').phase, 'prepared', 'failed start leaves E prepared for exact cancellation terminalization');

  // Cross-DB P->F cannot be atomic. Correct monotonic ordering is P first.
  const P = new Map();
  function admitP(id) { P.set(id, { id, phase: 'admitted', terminal: false }); }
  function failP(id, code) { const x = P.get(id); P.set(id, { ...x, phase: 'terminal', terminal: true, code }); }
  const fCap = new SerialStore();
  await admitF(fCap, { id: 'full1', state: 'admitted' }, { activeCap: 1, totalCap: 4 });
  admitP('P-cap');
  const cap = await admitF(fCap, { id: 'F-cap', state: 'admitted' }, { activeCap: 1, totalCap: 4 });
  eq(cap.code, 'F_ACTIVE_CAPACITY', 'F capacity may fail after P admission but before physical effect');
  failP('P-cap', cap.code);
  ok(P.get('P-cap').terminal, 'P becomes exact failed-before-effect rather than disappearing');

  // Crash P admitted -> no F: recovery uses same P, not a new physical operation.
  admitP('P-crash');
  ok(![...fCap.rows.values()].some((x) => x.P === 'P-crash'), 'crash schedule has P but no F');
  eq(P.get('P-crash').phase, 'admitted', 'P remains discoverable for reconciliation');

  // Unsafe two-step count/add demonstrates the race the spec forbids.
  const unsafe = [];
  const unsafeCountA = unsafe.length;
  const unsafeCountB = unsafe.length;
  if (unsafeCountA < 1) unsafe.push('A');
  if (unsafeCountB < 1) unsafe.push('B');
  eq(unsafe.length, 2, 'separate snapshot count + later insert can oversubscribe');

  // A same-transaction GC+admit is safe: delete only eligible terminal row, recount, add.
  const gcStore = new SerialStore();
  await gcStore.readwrite(async (tx) => {
    tx.add({ id: 'old-terminal', phase: 'local-finalized', gcEligible: true });
    tx.add({ id: 'active', phase: 'prepared', gcEligible: false });
  });
  async function gcThenAdmit(store, row, { activeCap, totalCap }) {
    return store.readwrite(async (tx) => {
      for (const old of tx.values()) {
        if (old.gcEligible) store.rows.delete(old.id);
      }
      const rows = tx.values();
      const active = countWhere(rows, (x) => E_ACTIVE.has(x.phase));
      if (active >= activeCap) return { ok: false, code: 'ACTIVE' };
      if (rows.length >= totalCap) return { ok: false, code: 'TOTAL' };
      tx.add(row);
      return { ok: true };
    });
  }
  ok((await gcThenAdmit(gcStore, { id: 'new', phase: 'prepared' }, { activeCap: 2, totalCap: 2 })).ok,
    'eligible terminal cleanup and admission can share one serialized transaction');
  eq(gcStore.rows.size, 2, 'total cap exact after gc+admit');
  ok(gcStore.rows.has('active') && gcStore.rows.has('new'), 'unresolved row retained');

  console.log(`Wave 1 Journal authority capacity admission model: PASS cases=${cases}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
