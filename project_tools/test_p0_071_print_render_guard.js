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
vm.runInNewContext(guardSource, sandbox, { filename: 'pdf-print-guard.js' });
const guard = sandbox.WebClipPdfPrintGuard;
assert.ok(guard, 'P0-071 guard must export deterministic helpers');
assert.equal(sandbox.__webclipPdfPrintGuardInstalled, true, 'P0-071 guard must install during worker bootstrap');

for (const href of [
  'https://example.test/path',
  'http://example.test/path',
  'mailto:person@example.test',
  'tel:+1234567890',
  '#inside',
  '/relative',
  './relative',
  '../relative',
  '//example.test/path'
]) assert.equal(guard.isSafePrintedHref(href), true, `expected safe printed href: ${href}`);

for (const href of [
  'javascript:alert(1)',
  'java\nscript:alert(1)',
  'java\u0000script:alert(1)',
  'data:text/html,bad',
  'file:///tmp/private',
  'vbscript:msgbox(1)'
]) assert.equal(guard.isSafePrintedHref(href), false, `expected blocked printed href: ${JSON.stringify(href)}`);

function attributesFor(row) {
  const out = [];
  for (const [name, value] of Object.entries(row)) out.push(name, String(value));
  return out;
}

function createHarness({ resultCount = 4, failPrint = false } = {}) {
  const calls = [];
  const messages = [];
  const attrs = new Map([
    [1, { href: 'https://safe.example/original', id: 'safe' }],
    [2, { href: 'javascript:window.__bad=1', id: 'js' }],
    [3, { href: 'data:text/html,bad', id: 'data' }],
    [4, { href: '#fragment', id: 'fragment' }]
  ]);
  let scriptsDisabled = false;
  let domEnabled = false;

  async function rawSendCommand(_debuggee, method, params = {}) {
    calls.push({ method, params: { ...params } });
    if (method === 'Page.enable') return { enabled: true };
    if (method === 'Emulation.setScriptExecutionDisabled') {
      scriptsDisabled = Boolean(params.value);
      return {};
    }
    if (method === 'DOM.enable') { domEnabled = true; return {}; }
    if (method === 'DOM.disable') { domEnabled = false; return {}; }
    if (method === 'DOM.getDocument' || method === 'DOM.discardSearchResults') {
      assert.equal(domEnabled, true, `${method} requires the same enabled DOM agent`);
      return {};
    }
    if (method === 'DOM.performSearch') {
      assert.equal(domEnabled, true);
      return { searchId: 'P0-071-search', resultCount };
    }
    if (method === 'DOM.getSearchResults') {
      assert.equal(domEnabled, true);
      return { nodeIds: [1, 2, 3, 4].slice(params.fromIndex, Math.min(params.toIndex, 4)) };
    }
    if (method === 'DOM.getAttributes') {
      assert.equal(domEnabled, true);
      return { attributes: attributesFor(attrs.get(params.nodeId) || {}) };
    }
    if (method === 'DOM.removeAttribute') {
      assert.equal(domEnabled, true, 'P0-071 must not invalidate frontend nodeIds before href removal');
      assert.equal(scriptsDisabled, true, 'P0-071 href removal must happen only after page scripts are frozen');
      const row = attrs.get(params.nodeId);
      if (row) delete row[params.name];
      return {};
    }
    if (method === 'DOM.setAttributeValue') {
      assert.equal(domEnabled, true, 'P0-071 must keep the DOM agent enabled so exact frontend nodeIds survive through print');
      assert.equal(scriptsDisabled, true, 'P0-071 href restore must finish before scripts resume');
      const row = attrs.get(params.nodeId) || {};
      row[params.name] = params.value;
      attrs.set(params.nodeId, row);
      return {};
    }
    if (method === 'Page.printToPDF') {
      assert.equal(domEnabled, true, 'DOM agent must remain enabled across Page.printToPDF so changed nodeIds remain restorable');
      assert.equal(scriptsDisabled, true, 'Page.printToPDF must run while page scripts are frozen');
      assert.equal(attrs.get(1).href, 'https://safe.example/original');
      assert.equal(attrs.get(2).href, undefined, 'javascript href must be absent from actual printed representation');
      assert.equal(attrs.get(3).href, undefined, 'data href must be absent from actual printed representation');
      assert.equal(attrs.get(4).href, '#fragment');
      if (failPrint) throw new Error('synthetic print failure');
      return { stream: 'stream-1' };
    }
    if (method === 'IO.close') return {};
    throw new Error(`unexpected command ${method}`);
  }

  async function sendRenderState(tabId, hidden) {
    messages.push({ tabId, hidden });
    return { ok: true };
  }

  return { calls, messages, attrs, rawSendCommand, sendRenderState };
}

(async () => {
  {
    const harness = createHarness();
    const sendCommand = guard.createGuardedSendCommand(harness);
    const passthrough = await sendCommand({ tabId: 7 }, 'Page.enable', {});
    assert.deepEqual(passthrough, { enabled: true });
    assert.deepEqual(harness.messages, []);

    const printed = await sendCommand({ tabId: 7 }, 'Page.printToPDF', { transferMode: 'ReturnAsStream' });
    assert.equal(printed.stream, 'stream-1');
    assert.deepEqual(harness.messages, [{ tabId: 7, hidden: true }, { tabId: 7, hidden: false }]);
    assert.equal(harness.attrs.get(2).href, 'javascript:window.__bad=1', 'live-page javascript href must be restored after physical print');
    assert.equal(harness.attrs.get(3).href, 'data:text/html,bad', 'live-page data href must be restored after physical print');

    const methods = harness.calls.map((item) => item.method);
    const disableScriptsAt = methods.indexOf('Emulation.setScriptExecutionDisabled');
    const searchAt = methods.indexOf('DOM.performSearch');
    const printAt = methods.indexOf('Page.printToPDF');
    const disableDomAt = methods.indexOf('DOM.disable');
    const enableScriptsAt = methods.findIndex((method, index) => index > printAt && method === 'Emulation.setScriptExecutionDisabled');
    assert.ok(disableScriptsAt >= 0 && disableScriptsAt < searchAt && searchAt < printAt && printAt < disableDomAt && disableDomAt < enableScriptsAt,
      `unexpected P0-071 render-cut command order: ${methods.join(' -> ')}`);
    assert.equal(harness.calls[disableScriptsAt].params.value, true);
    assert.equal(harness.calls[enableScriptsAt].params.value, false);
  }

  {
    const harness = createHarness({ failPrint: true });
    const sendCommand = guard.createGuardedSendCommand(harness);
    await assert.rejects(() => sendCommand({ tabId: 8 }, 'Page.printToPDF', {}), /synthetic print failure/);
    assert.equal(harness.attrs.get(2).href, 'javascript:window.__bad=1', 'failed print must still restore live-page href');
    assert.equal(harness.attrs.get(3).href, 'data:text/html,bad', 'failed print must still restore live-page href');
    assert.deepEqual(harness.messages, [{ tabId: 8, hidden: true }, { tabId: 8, hidden: false }], 'failed print must still restore WebClip render state');
    const toggles = harness.calls.filter((item) => item.method === 'Emulation.setScriptExecutionDisabled').map((item) => item.params.value);
    assert.deepEqual(toggles, [true, false], 'failed print must re-enable page scripts');
  }

  {
    const harness = createHarness({ resultCount: guard.MAX_PRINT_LINKS + 1 });
    const sendCommand = guard.createGuardedSendCommand(harness);
    await assert.rejects(
      () => sendCommand({ tabId: 9 }, 'Page.printToPDF', {}),
      (error) => error?.code === 'WEBCLIP_PDF_LINK_BUDGET_EXCEEDED'
    );
    assert.equal(harness.calls.some((item) => item.method === 'Page.printToPDF'), false, 'over-budget actual representation must fail closed before printing');
    const toggles = harness.calls.filter((item) => item.method === 'Emulation.setScriptExecutionDisabled').map((item) => item.params.value);
    assert.deepEqual(toggles, [true, false]);
    assert.deepEqual(harness.messages, [{ tabId: 9, hidden: true }, { tabId: 9, hidden: false }]);
  }

  console.log('P0-071 print render guard: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
