'use strict';

// P0-071 deterministic regression: safe URI schemes must be enforced on the
// actual Page.printToPDF representation after page script execution is frozen.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(ROOT, 'pdf-print-guard.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(ROOT, 'journal-text-filter.js'), 'utf8');

assert.match(workerSource, /importScripts\([^\n]*'journal-text-filter\.js'/, 'service worker must synchronously load the worker bootstrap');
assert.match(bootstrapSource, /typeof importScripts === 'function'/, 'shared Journal helper must keep the bootstrap worker-only');
assert.match(bootstrapSource, /importScripts\('pdf-print-guard\.js',\s*'content-injection-guard\.js',\s*'operation-log-redaction-guard\.js'\)/, 'worker bootstrap must load the P0-071 guard first before later security bootstraps and service-worker body execution');

const installRawCalls = [];
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  chrome: {
    debugger: {
      async sendCommand(_debuggee, method, params) {
        installRawCalls.push({ method, params });
        return {};
      }
    },
    tabs: {
      async sendMessage() { return { ok: true }; }
    }
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(guardSource, sandbox, { filename: 'pdf-print-guard.js' });
assert.ok(sandbox.WebClipPdfPrintGuard, 'guard must export deterministic helpers');

const guard = sandbox.WebClipPdfPrintGuard;
assert.equal(guard.safePrintedUri('https://example.com/a'), true);
assert.equal(guard.safePrintedUri('http://example.com/a'), true);
assert.equal(guard.safePrintedUri('mailto:test@example.com'), true);
assert.equal(guard.safePrintedUri('tel:+123'), true);
assert.equal(guard.safePrintedUri('#section'), true);
assert.equal(guard.safePrintedUri('javascript:alert(1)'), false);
assert.equal(guard.safePrintedUri('data:text/html,boom'), false);
assert.equal(guard.safePrintedUri('vbscript:boom'), false);

const removed = [];
const scanResponses = [
  {
    root: { nodeId: 1 },
    nodes: [
      { nodeId: 10, nodeName: 'A', attributes: ['href', 'https://safe.example/a'] },
      { nodeId: 11, nodeName: 'A', attributes: ['href', 'javascript:alert(1)'] },
      { nodeId: 12, nodeName: 'A', attributes: ['href', 'data:text/html,boom'] },
      { nodeId: 13, nodeName: 'A', attributes: ['href', '#inside'] }
    ]
  }
];
const raw = async (_debuggee, method, params = {}) => {
  if (method === 'DOM.getDocument') return { root: { nodeId: 1 } };
  if (method === 'DOM.getFlattenedDocument') return scanResponses[0].nodes;
  if (method === 'DOM.removeAttribute') {
    removed.push({ nodeId: params.nodeId, name: params.name });
    return {};
  }
  if (method === 'Runtime.evaluate') return { result: { value: true } };
  if (method === 'Emulation.setScriptExecutionDisabled') return {};
  throw new Error(`unexpected method ${method}`);
};

(async () => {
  const result = await guard.guardPrintedRepresentation({ tabId: 7 }, raw);
  assert.equal(result.ok, true);
  assert.deepEqual(removed, [
    { nodeId: 11, name: 'href' },
    { nodeId: 12, name: 'href' }
  ]);
  assert.equal(result.removedUnsafeHrefCount, 2);
  console.log('P0-071 print render guard deterministic regression: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
