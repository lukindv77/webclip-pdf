const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker}`);
  return text.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function createHarness({ timeoutIds = [] } = {}) {
  const timeoutSet = new Set(timeoutIds.map(String));
  const pending = new Map();
  const started = [];
  const shown = [];
  let activeUnderlying = 0;
  let maxActiveUnderlying = 0;

  const operationLogDetail = {
    hidden: false,
    classList: {
      add() { operationLogDetail.hidden = true; },
      remove() { operationLogDetail.hidden = false; }
    },
    scrollIntoView() {}
  };
  const operationLogTitle = { textContent: '' };
  const operationLogDescription = { textContent: '' };
  const operationLogId = { textContent: '' };
  const operationLogJson = { textContent: '', classList: { remove() {} } };
  const toggle = { textContent: '' };

  const context = vm.createContext({
    console, Promise, Error, String, JSON,
    operationLogDetail, operationLogTitle, operationLogDescription, operationLogId, operationLogJson,
    el(id) { if (id === 'toggleOperationLogText') return toggle; throw new Error(id); },
    showMessage(message, kind) { shown.push({ message, kind }); },
    requireOk(response) { if (!response?.ok) throw new Error(response?.error || 'failed'); return response; },
    getReadOnlyRuntimeMessageActual(message) {
      const id = String(message.operationId);
      const d = deferred();
      started.push(id);
      activeUnderlying += 1;
      maxActiveUnderlying = Math.max(maxActiveUnderlying, activeUnderlying);
      pending.set(id, d);
      const tracked = d.promise.finally(() => { activeUnderlying -= 1; });
      tracked.operationId = id;
      return tracked;
    },
    waitReadOnlyRuntimeMessage(actual) {
      if (timeoutSet.has(String(actual.operationId))) return Promise.reject(new Error('simulated local timeout'));
      return actual;
    }
  });

  const code = `let selectedOperationLogId = 'previous';\nlet operationLogDetailGeneration = 0;\nlet operationLogSelectionGeneration = 0;\nlet operationLogDetailRequestInFlight = false;\nlet queuedOperationLogDetailRequest = null;\n${between(source, 'function openOperationLog', 'function toggleOperationLogText')}\nthis.openForTest = openOperationLog;\nthis.getSelected = () => selectedOperationLogId;`;
  vm.runInContext(code, context);

  return { context, pending, started, shown, operationLogTitle, getMaxActive: () => maxActiveUnderlying };
}

(async () => {
  assert(source.includes('let operationLogDetailRequestInFlight = false;'), 'P1-145 requires an explicit single active detail request guard');
  assert(source.includes('let queuedOperationLogDetailRequest = null;'), 'P1-145 requires one latest queued detail slot');
  assert(source.includes('if (queuedOperationLogDetailRequest?.resolve) queuedOperationLogDetailRequest.resolve();'), 'superseded queued request must resolve without starting');
  assert(source.includes('if (operationLogDetailRequestInFlight) return;'), 'drain must not start a second detail RPC while one is active');
  assert(source.includes('Promise.resolve(actual).finally(() => {'), 'active slot must be released by actual settlement, not by the local deadline');

  // Rapid A -> B -> C: B must never allocate an underlying RPC.
  {
    const h = createHarness();
    const a = h.context.openForTest('A');
    assert.deepStrictEqual(h.started, ['A'], 'A must start immediately');
    const b = h.context.openForTest('B');
    const c = h.context.openForTest('C');
    await b;
    assert.deepStrictEqual(h.started, ['A'], 'B must be superseded in the one-slot queue while A is active');
    assert.strictEqual(h.getMaxActive(), 1);

    h.pending.get('A').resolve({ ok: true, log: { title: 'A title', description: 'A desc' } });
    await a;
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(h.started, ['A', 'C'], 'only latest queued C may start after A actually settles');
    assert(!h.pending.has('B'), 'B must never allocate an underlying RPC');
    assert.strictEqual(h.context.getSelected(), '', 'stale A must not become selected while C is newer');

    h.pending.get('C').resolve({ ok: true, log: { title: 'C title', description: 'C desc' } });
    await c;
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(h.context.getSelected(), 'C');
    assert.strictEqual(h.operationLogTitle.textContent, 'C title');
    assert.strictEqual(h.getMaxActive(), 1);
    assert.strictEqual(h.shown.length, 0);
  }

  // Local timeout is not cancellation: U must stay queued until timed-out T's
  // underlying runtime read actually settles.
  {
    const h = createHarness({ timeoutIds: ['T'] });
    const t = h.context.openForTest('T');
    await t; // local timeout path resolves the caller, but actual T is unresolved.
    assert.deepStrictEqual(h.started, ['T']);

    const u = h.context.openForTest('U');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(h.started, ['T'], 'local timeout must not free the active slot while underlying T is unresolved');
    assert.strictEqual(h.getMaxActive(), 1);

    h.pending.get('T').resolve({ ok: true, log: { title: 'late T' } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(h.started, ['T', 'U'], 'latest queued U starts only after actual T settlement');
    assert.strictEqual(h.getMaxActive(), 1, 'late settlement must never create parallel detail reads');

    h.pending.get('U').resolve({ ok: true, log: { title: 'U title', description: 'U desc' } });
    await u;
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(h.context.getSelected(), 'U');
  }

  console.log('P1-145 OperationLog latest-wins/actual-settlement queue regression OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
