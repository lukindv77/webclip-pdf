'use strict';

const assert = require('assert');

class UserReachedHistoryModel {
  constructor({ maxItems = 64, maxChars = 10000 } = {}) {
    this.maxItems = maxItems;
    this.maxChars = maxChars;
    this.sessionGeneration = 0;
    this.contexts = new Map();
    this.totalChars = 0;
  }

  startSession(contextIds = ['top']) {
    this.sessionGeneration += 1;
    this.contexts.clear();
    this.totalChars = 0;
    for (const id of contextIds) this._ensureContext(id);
    return this.sessionGeneration;
  }

  _ensureContext(id) {
    if (!this.contexts.has(id)) {
      this.contexts.set(id, {
        id,
        generation: this.sessionGeneration,
        maxUserExtent: 0,
        currentExtent: 0,
        history: new Map(),
        order: [],
        status: 'complete',
        reason: ''
      });
    }
    return this.contexts.get(id);
  }

  admitInitialMounted(contextId, items) {
    const ctx = this._ensureContext(contextId);
    for (const item of items) this._capture(ctx, item, { initial: true });
    return ctx;
  }

  observeScroll(contextId, { extent, authority = 'user' }) {
    const ctx = this._ensureContext(contextId);
    ctx.currentExtent = Math.max(0, Number(extent) || 0);
    // Only explicit user-scroll authority may enlarge the dynamic boundary.
    // P0-075/browser evidence owns how production proves this authority.
    if (authority === 'user') ctx.maxUserExtent = Math.max(ctx.maxUserExtent, ctx.currentExtent);
    return ctx;
  }

  materialized(contextId, items, { cause = 'ordinary', generation = this.sessionGeneration } = {}) {
    const ctx = this._ensureContext(contextId);
    if (generation !== this.sessionGeneration || ctx.generation !== generation) return { stale: true };
    if (cause === 'webclip-auto-scroll' || cause === 'page-script-scroll') return { ignored: true };

    // Initial/ordinary current DOM may be captured. Dynamic scroll-generated content
    // needs a user-reached boundary > 0; fixture item.reachedExtent proves it was
    // materialized at/below the accepted boundary.
    for (const item of items) {
      const reached = Math.max(0, Number(item.reachedExtent) || 0);
      if (cause === 'user-scroll' && reached > ctx.maxUserExtent) continue;
      if (cause === 'user-scroll' && ctx.maxUserExtent <= 0) continue;
      this._capture(ctx, item, { initial: false });
    }
    return { stale: false };
  }

  _capture(ctx, item, { initial }) {
    const logicalId = String(item.logicalId);
    const text = String(item.text || '');
    const key = `${logicalId}@${String(item.materializationRevision || 0)}`;
    if (ctx.history.has(key)) return;

    if (ctx.order.length >= this.maxItems || this.totalChars + text.length > this.maxChars) {
      ctx.status = 'partial';
      ctx.reason = 'history-budget';
      return;
    }

    const snapshot = {
      logicalId,
      materializationRevision: String(item.materializationRevision || 0),
      text,
      reachedExtent: Math.max(0, Number(item.reachedExtent) || 0),
      initial: Boolean(initial)
    };
    ctx.history.set(key, snapshot);
    ctx.order.push(key);
    this.totalChars += text.length;
  }

  printRepresentation(contextId, currentMountedItems, { generation = this.sessionGeneration } = {}) {
    const ctx = this._ensureContext(contextId);
    if (generation !== this.sessionGeneration || ctx.generation !== generation) {
      return { status: 'unknown', items: [], reason: 'stale-generation' };
    }
    const byLogical = new Map();

    // History is authoritative only for content admitted in this session.
    for (const key of ctx.order) {
      const snap = ctx.history.get(key);
      if (!snap) continue;
      byLogical.set(snap.logicalId, snap);
    }

    // Current mounted state can provide the newest representation of an already
    // admitted logical item, but cannot erase older distinct logical items.
    for (const item of currentMountedItems) {
      const id = String(item.logicalId);
      if (!byLogical.has(id)) continue;
      byLogical.set(id, {
        logicalId: id,
        materializationRevision: String(item.materializationRevision || 0),
        text: String(item.text || ''),
        reachedExtent: Math.max(0, Number(item.reachedExtent) || 0),
        initial: false
      });
    }

    return {
      status: ctx.status,
      reason: ctx.reason,
      maxUserExtent: ctx.maxUserExtent,
      items: [...byLogical.values()]
    };
  }
}

function items(start, end, revision = 1, reachedExtent = end) {
  const out = [];
  for (let n = start; n <= end; n += 1) {
    out.push({
      logicalId: `ITEM-${String(n).padStart(3, '0')}`,
      text: `TEXT-${String(n).padStart(3, '0')}`,
      materializationRevision: revision,
      reachedExtent
    });
  }
  return out;
}

function legacyCurrentShapeCounterexample() {
  const seen = items(1, 57);
  const mountedAfterScrollBack = items(1, 8);
  assert.strictEqual(seen.length, 57);
  assert.strictEqual(mountedAfterScrollBack.length, 8);
  // Current capture has no history ledger, so physical representation collapses to mounted window.
  return 'P1-230 current-shape counterexample: user materialized items 1..57, virtualizer recycled them, and current-DOM capture after scroll-back contains only 1..8';
}

function run() {
  console.log(legacyCurrentShapeCounterexample());

  // A. No user scroll: initial mounted content is admitted, but WebClip does not invent N+1.
  {
    const m = new UserReachedHistoryModel();
    m.startSession();
    m.admitInitialMounted('top', items(1, 20, 1, 0));
    const r = m.printRepresentation('top', items(1, 20, 1, 0));
    assert.strictEqual(r.items.length, 20);
    assert.strictEqual(r.maxUserExtent, 0);
  }

  // B. Additive dynamic content retained in DOM remains printable without special reconstruction.
  {
    const m = new UserReachedHistoryModel();
    m.startSession();
    m.admitInitialMounted('top', items(1, 20, 1, 0));
    m.observeScroll('top', { extent: 40, authority: 'user' });
    m.materialized('top', items(21, 40, 1, 40), { cause: 'user-scroll' });
    const current = items(1, 40, 1, 40);
    const r = m.printRepresentation('top', current);
    assert.strictEqual(r.items.length, 40);
  }

  // C. Gradual virtual traversal then scroll-back preserves all actually materialized logical items.
  {
    const m = new UserReachedHistoryModel({ maxItems: 100 });
    m.startSession();
    m.admitInitialMounted('top', items(1, 8, 1, 0));
    for (const [start, end] of [[9,16],[17,24],[25,32],[33,40],[41,48],[49,57]]) {
      m.observeScroll('top', { extent: end, authority: 'user' });
      m.materialized('top', items(start, end, 1, end), { cause: 'user-scroll' });
    }
    // User returns to top. Boundary must not shrink.
    m.observeScroll('top', { extent: 0, authority: 'user' });
    const r = m.printRepresentation('top', items(1, 8, 2, 0));
    assert.strictEqual(r.maxUserExtent, 57);
    assert.strictEqual(r.items.length, 57);
    assert(r.items.some((x) => x.logicalId === 'ITEM-057'));
  }

  // D. Page-script scrolling without accepted user authority cannot enlarge the boundary/history.
  {
    const m = new UserReachedHistoryModel();
    m.startSession();
    m.admitInitialMounted('top', items(1, 8, 1, 0));
    m.observeScroll('top', { extent: 80, authority: 'page-script' });
    m.materialized('top', items(9, 80, 1, 80), { cause: 'page-script-scroll' });
    const r = m.printRepresentation('top', items(73, 80, 1, 80));
    assert.strictEqual(r.maxUserExtent, 0);
    assert.strictEqual(r.items.length, 8);
  }

  // E. WebClip's own UI/candidate centering may move scroll, but cannot enlarge user capture authority.
  {
    const m = new UserReachedHistoryModel();
    m.startSession();
    m.admitInitialMounted('top', items(1, 8, 1, 0));
    m.observeScroll('top', { extent: 50, authority: 'webclip' });
    m.materialized('top', items(9, 50, 1, 50), { cause: 'webclip-auto-scroll' });
    const r = m.printRepresentation('top', items(43, 50, 1, 50));
    assert.strictEqual(r.maxUserExtent, 0);
    assert.strictEqual(r.items.length, 8);
  }

  // F. Nested scroll contexts maintain independent boundaries and histories.
  {
    const m = new UserReachedHistoryModel({ maxItems: 100 });
    m.startSession(['top', 'panel']);
    m.admitInitialMounted('top', items(1, 4, 1, 0));
    m.admitInitialMounted('panel', items(101, 104, 1, 0));
    m.observeScroll('panel', { extent: 112, authority: 'user' });
    m.materialized('panel', items(105, 112, 1, 112), { cause: 'user-scroll' });
    assert.strictEqual(m.printRepresentation('top', items(1,4)).items.length, 4);
    assert.strictEqual(m.printRepresentation('panel', items(101,104)).items.length, 12);
  }

  // G. A new capture/document/application generation cannot inherit stale virtual history.
  {
    const m = new UserReachedHistoryModel({ maxItems: 100 });
    const g1 = m.startSession();
    m.admitInitialMounted('top', items(1, 8));
    m.observeScroll('top', { extent: 40, authority: 'user' });
    m.materialized('top', items(9, 40, 1, 40), { cause: 'user-scroll', generation: g1 });
    const g2 = m.startSession();
    assert.notStrictEqual(g1, g2);
    m.admitInitialMounted('top', items(201, 208));
    const stale = m.materialized('top', items(41, 48, 1, 48), { cause: 'user-scroll', generation: g1 });
    assert.strictEqual(stale.stale, true);
    const r = m.printRepresentation('top', items(201,208), { generation: g2 });
    assert.strictEqual(r.items.some((x) => x.logicalId === 'ITEM-040'), false);
  }

  // H. History budget exhaustion is truthful partial, never silent full success.
  {
    const m = new UserReachedHistoryModel({ maxItems: 10, maxChars: 10000 });
    m.startSession();
    m.admitInitialMounted('top', items(1, 8));
    m.observeScroll('top', { extent: 20, authority: 'user' });
    m.materialized('top', items(9, 20, 1, 20), { cause: 'user-scroll' });
    const r = m.printRepresentation('top', items(1,8));
    assert.strictEqual(r.status, 'partial');
    assert.strictEqual(r.reason, 'history-budget');
    assert(r.items.length <= 10);
  }

  // I. Reused DOM row identity cannot retarget prior logical history.
  {
    const m = new UserReachedHistoryModel({ maxItems: 100 });
    m.startSession();
    m.admitInitialMounted('top', [{
      logicalId: 'ROW-003', text: 'VR-003', materializationRevision: 1, reachedExtent: 0
    }]);
    m.observeScroll('top', { extent: 52, authority: 'user' });
    // Same physical row is now a different logical item; model stores logical snapshots, not node identity.
    m.materialized('top', [{
      logicalId: 'ROW-052', text: 'VR-052', materializationRevision: 2, reachedExtent: 52
    }], { cause: 'user-scroll' });
    const r = m.printRepresentation('top', [{
      logicalId: 'ROW-052', text: 'VR-052', materializationRevision: 2, reachedExtent: 52
    }]);
    assert(r.items.some((x) => x.logicalId === 'ROW-003' && x.text === 'VR-003'));
    assert(r.items.some((x) => x.logicalId === 'ROW-052' && x.text === 'VR-052'));
  }

  // J. Remote/same-origin child contexts can use the same semantics without flattening context identity.
  {
    const m = new UserReachedHistoryModel({ maxItems: 100 });
    m.startSession(['top', 'frame:17/doc:A']);
    m.admitInitialMounted('frame:17/doc:A', items(1, 8));
    m.observeScroll('frame:17/doc:A', { extent: 24, authority: 'user' });
    m.materialized('frame:17/doc:A', items(9,24,1,24), { cause: 'user-scroll' });
    const r = m.printRepresentation('frame:17/doc:A', items(1,8));
    assert.strictEqual(r.items.length, 24);
    assert.strictEqual(r.maxUserExtent, 24);
  }

  console.log('P1-230 user-reached dynamic/virtualized history deterministic model: PASS');
}

run();
