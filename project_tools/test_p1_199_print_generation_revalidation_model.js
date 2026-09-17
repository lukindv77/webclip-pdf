'use strict';
// P1-199 research only: current-source counterexamples and proposed protocol.
// P1-200 selection, P1-201 consent, P1-203 restart, P1-214 debt, P1-218 DOM ownership.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const agent = read('frame-agent.js');
const content = read('content.js');
const worker = read('service-worker.js');
const registry = read('project_docs/RESEARCH_REGISTRY.md');
assert.match(registry, /\| P1-199 \| ACTIVE \|/);
function between(s, a, b) {
  const start = s.indexOf(a); assert.ok(start >= 0, a);
  const end = s.indexOf(b, start + a.length); assert.ok(end > start, b);
  return s.slice(start, end);
}
const currentFunctions = between(agent, '  async function preparePrint()', '  chrome.runtime.onMessage.addListener');
assert.doesNotMatch(currentFunctions, /printGeneration|permissionEra/);
assert.match(currentFunctions, /admitSelectionGeneration\('remote-prepare-print'\)/, 'P0-080 application-generation admission must precede the current P1-199 print path.');
assert.match(content, /commandMappedRemoteFrames\('prepare-print', \{\}/);
const routing = between(worker, "case 'WEBCLIP_FRAME_AGENT_TARGET':", "case 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_REQUEST':");
assert.doesNotMatch(routing, /printGeneration|permissionEra/);
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; }
function currentHarness() {
  const nodes = []; const waits = [];
  const state = { phase: 'selecting', changedAttrs: [], printStyle: null };
  const document = {
    documentElement: {scrollHeight: 10}, body: {scrollHeight: 10},
    head: {appendChild(n) { nodes.push(n); }},
    createElement() { return {remove() {const i = nodes.indexOf(this); if (i >= 0) nodes.splice(i, 1);}}; }
  };
  const context = vm.createContext({state, document, PRINT_STYLE_ID:'print', INCLUDE_ATTR:'include', EXCLUDE_ATTR:'exclude',
    admitSelectionGeneration() { return {ok:true, receipt:null}; },
    prefetchSelected() {const d = deferred(); waits.push(d); return d.promise;}});
  vm.runInContext(currentFunctions + '\nthis.prepare = preparePrint; this.restore = restorePrint;', context);
  return {context, state, nodes, waits};
}
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name); }

// Proposed state machine, not production code. One exact reconciled identity scope.
class Child {
  constructor(scope = 'doc:D/worker:W/permission:A/selection:S') {
    this.scope = scope; this.granted = true; this.highest = 0; this.closed = 0;
    this.current = null; this.debt = false; this.styles = new Set(); this.effects = 0;
  }
  valid(g) { return Number.isSafeInteger(g) && g > 0; }
  async prepare(scope, g, wait = Promise.resolve()) {
    if (scope !== this.scope || !this.granted || !this.valid(g)) return 'rejected';
    if (g <= this.closed || g < this.highest) return 'stale';
    if (this.current?.g === g) return this.current.phase; // no duplicate mutation
    if (this.current || this.debt) return 'busy'; // P1-214 settlement prerequisite
    this.highest = g;
    const receipt = {g, scope, phase:'preparing'}; this.current = receipt;
    await wait;
    if (this.current !== receipt || scope !== this.scope || !this.granted || g <= this.closed) return 'stale';
    this.styles.add(receipt); this.effects++; receipt.phase = 'prepared'; return 'prepared';
  }
  restore(scope, g, settled = true) {
    // Caller is assumed to have passed exact ordinary or cleanup-only admission.
    if (scope !== this.scope || !this.valid(g)) return 'rejected';
    this.highest = Math.max(this.highest, g); this.closed = Math.max(this.closed, g);
    // Ordered close(G) closes <=G, but never touches a newer generation.
    if (this.current && this.current.g <= g) {
      this.styles.delete(this.current); this.current = null;
    }
    this.debt = this.debt || !settled;
    return settled ? 'clean-local' : 'unknown';
  }
  revoke() { this.granted = false; if (this.current) this.closed = Math.max(this.closed, this.current.g); }
  reconcile(scope) {
    if (this.current || this.debt || this.styles.size) return false;
    this.scope = scope; this.granted = true; this.highest = 0; this.closed = 0; return true;
  }
}
async function main() {
  await check('current-source: restore during await does not prevent late style', async () => {
    const h = currentHarness(); const a = h.context.prepare(); h.context.restore();
    h.waits[0].resolve({}); await a; assert.equal(h.nodes.length, 1);
  });
  await check('current-source: stale restore removes newer preparation', async () => {
    const h = currentHarness(); const a = h.context.prepare(); h.waits[0].resolve({}); await a;
    h.context.restore(); const b = h.context.prepare(); h.waits[1].resolve({}); await b;
    h.context.restore(); assert.equal(h.nodes.length, 0);
  });
  await check('current-source: overlapping prepares leave an orphan style', async () => {
    const h = currentHarness(); const a = h.context.prepare(); const b = h.context.prepare();
    h.waits[1].resolve({}); await b; h.waits[0].resolve({}); await a;
    assert.equal(h.nodes.length, 2); h.context.restore(); assert.equal(h.nodes.length, 1);
  });
  await check('target: close before prepare permanently fences same and older generations', async () => {
    const c = new Child(); c.restore(c.scope, 3);
    for (const g of [1,2,3]) assert.equal(await c.prepare(c.scope,g), 'stale');
    assert.equal(await c.prepare(c.scope,4), 'prepared');
  });
  await check('target: cancellation during await prevents continuation', async () => {
    const c = new Child(); const d = deferred(); const p = c.prepare(c.scope,1,d.promise);
    c.restore(c.scope,1); d.resolve(); assert.equal(await p,'stale'); assert.equal(c.effects,0);
  });
  await check('target: stale A cleanup and completion preserve B', async () => {
    const c = new Child(); const d = deferred(); const p = c.prepare(c.scope,1,d.promise);
    c.restore(c.scope,1); await c.prepare(c.scope,2); c.restore(c.scope,1); d.resolve();
    assert.equal(await p,'stale'); assert.equal(c.current.g,2); assert.equal(c.styles.size,1);
  });
  await check('target: duplicate prepare has no second mutation; active debt blocks replacement', async () => {
    const c = new Child(); await c.prepare(c.scope,1); await c.prepare(c.scope,1);
    assert.equal(c.effects,1); assert.equal(await c.prepare(c.scope,2),'busy');
    c.restore(c.scope,1,false); assert.equal(await c.prepare(c.scope,2),'busy');
  });
  await check('target: revoked ordinary authority stays closed with unknown cleanup', async () => {
    const c = new Child(); const d = deferred(); const p = c.prepare(c.scope,1,d.promise);
    c.revoke(); c.restore(c.scope,1,false); d.resolve(); assert.equal(await p,'stale');
    assert.equal(await c.prepare(c.scope,2),'rejected'); assert.equal(c.reconcile('permission:B'),false);
  });
  await check('target: fresh regrant may restart numeric counter but rejects old era', async () => {
    const c = new Child(); const old = c.scope; await c.prepare(old,9); c.revoke(); c.restore(old,9);
    assert.equal(c.reconcile('doc:D/worker:W/permission:B/selection:T'),true);
    await c.prepare(c.scope,1); assert.equal(c.restore(old,999),'rejected');
    assert.equal(await c.prepare(old,999),'rejected'); assert.equal(c.current.g,1);
  });
  await check('target: document, worker and selection identity cannot alias', async () => {
    for (const scope of ['doc:E','worker:X','selection:T']) {
      const c = new Child(); await c.prepare(c.scope,1);
      assert.equal(c.restore(scope,1),'rejected'); assert.equal(await c.prepare(scope,2),'rejected');
      assert.equal(c.styles.size,1);
    }
  });
  await check('target: malformed generations fail closed without changing high-water marks', async () => {
    const c = new Child(); for (const g of [0,-1,NaN,Infinity,1.5,'2',Number.MAX_SAFE_INTEGER+1]) {
      assert.equal(await c.prepare(c.scope,g),'rejected'); assert.equal(c.restore(c.scope,g),'rejected');
    } assert.equal(c.highest,0);
  });
  await check('target: all 24 synchronous prepare/restore schedules preserve closure', async () => {
    function permutations(xs) {return xs.length ? xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(p=>[x,...p])) : [[]];}
    for (const order of permutations(['p1','r1','p2','r2'])) {
      const c = new Child(); let closed = 0;
      for (const op of order) {
        const g = Number(op[1]); if(op[0]==='p') await c.prepare(c.scope,g);
        else {c.restore(c.scope,g); closed=Math.max(closed,g);}
        assert.ok(!c.current || c.current.g > closed); assert.ok(c.styles.size <= 1);
      }
    }
  });
  console.log(`P1-199 research checks=${checks}; current counterexamples reproduced; target model PASS; production closure NOT CLAIMED`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
