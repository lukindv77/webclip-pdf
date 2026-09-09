'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const CHROME_BIN = process.env.CHROME_BIN;
if (!CHROME_BIN) throw new Error('CHROME_BIN is required');

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function extensionIdFromPublicKey(der) {
  const digest = crypto.createHash('sha256').update(der).digest().subarray(0, 16);
  let id = '';
  for (const byte of digest) {
    id += String.fromCharCode(97 + (byte >> 4));
    id += String.fromCharCode(97 + (byte & 0x0f));
  }
  return id;
}

function requestJson(port, method, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: requestPath, method }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 500)}`));
          return;
        }
        try { resolve(JSON.parse(text)); } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForFile(file, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function stopChild(child) {
  if (!child || child.exitCode != null) return;
  try { child.kill('SIGTERM'); } catch (_) {}
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(2000)
  ]);
  if (child.exitCode == null) {
    try { child.kill('SIGKILL'); } catch (_) {}
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      sleep(1000)
    ]);
  }
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else pending.resolve(message.result || {});
    });
  }
  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket open timeout')), 10000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP WebSocket error')); }, { once: true });
    });
  }
  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-a1a2-'));
  const extDir = path.join(root, 'extension');
  const profileDir = path.join(root, 'profile');
  fs.mkdirSync(extDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const marker = url.pathname === '/b' ? 'B' : 'A';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><title>Fixture ${marker}</title><main id="root">Fixture ${marker}</main>`);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const testPort = server.address().port;
  const testBase = `http://127.0.0.1:${testPort}`;

  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
  const publicDer = publicKey.export({ type: 'spki', format: 'der' });
  const extensionKey = publicDer.toString('base64');
  const extensionId = extensionIdFromPublicKey(publicDer);

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'WebClip A1 A2 authority research fixture',
    version: '1.0.0',
    key: extensionKey,
    minimum_chrome_version: '118',
    permissions: ['scripting', 'tabs'],
    host_permissions: ['http://127.0.0.1/*'],
    background: { service_worker: 'worker.js' }
  }, null, 2));

  fs.writeFileSync(path.join(extDir, 'worker.js'), `
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'A1A2_REPORT_SENDER') return false;
  sendResponse({
    ok: true,
    documentId: String(sender.documentId || ''),
    documentLifecycle: String(sender.documentLifecycle || ''),
    frameId: Number(sender.frameId),
    url: String(sender.url || '')
  });
  return false;
});
`);

  fs.writeFileSync(path.join(extDir, 'probe.js'), `
(() => {
  const existing = globalThis.__A1A2_AUTHORITY_PROBE__;
  if (existing) return existing.installResult;
  const nav = globalThis.navigation;
  const state = {
    events: [],
    sender: null,
    navigationAvailable: Boolean(nav && nav.currentEntry && nav.addEventListener),
    initialEntryId: nav?.currentEntry?.id || '',
    initialEntryKey: nav?.currentEntry?.key || '',
    initialUrl: location.href,
    installResult: { installed: true, navigationAvailable: Boolean(nav && nav.currentEntry) }
  };
  globalThis.__A1A2_AUTHORITY_PROBE__ = state;
  if (state.navigationAvailable) {
    nav.addEventListener('currententrychange', (event) => {
      state.events.push({
        navigationType: String(event.navigationType || ''),
        id: String(nav.currentEntry?.id || ''),
        key: String(nav.currentEntry?.key || ''),
        url: String(nav.currentEntry?.url || location.href),
        stateValue: (() => { try { return nav.currentEntry?.getState?.()?.fixtureState ?? null; } catch (_) { return null; } })()
      });
    });
  }
  chrome.runtime.sendMessage({ type: 'A1A2_REPORT_SENDER' }).then((value) => { state.sender = value || null; }).catch(() => {});
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'A1A2_PROBE_INFO') return false;
    sendResponse({
      ok: true,
      navigationAvailable: state.navigationAvailable,
      initialEntryId: state.initialEntryId,
      initialEntryKey: state.initialEntryKey,
      currentEntryId: String(nav?.currentEntry?.id || ''),
      currentEntryKey: String(nav?.currentEntry?.key || ''),
      currentUrl: location.href,
      events: state.events.slice(),
      sender: state.sender
    });
    return false;
  });
  return state.installResult;
})();
`);

  fs.writeFileSync(path.join(extDir, 'runner.html'), '<!doctype html><meta charset="utf-8"><body>RUNNING<script src="runner.js"></script></body>');
  fs.writeFileSync(path.join(extDir, 'runner.js'), `
(async () => {
  const TEST_BASE = ${JSON.stringify(testBase)};
  const cases = [];
  const pass = (name, details = null) => cases.push({ name, ok: true, details });
  const assert = (value, name, details = null) => {
    if (!value) throw new Error(name + (details ? ': ' + JSON.stringify(details) : ''));
    pass(name, details);
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitComplete = (tabId) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error('tab load timeout')); }, 10000);
    const listener = (id, info) => {
      if (id !== tabId || info.status !== 'complete') return;
      clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve(); }
    }).catch(() => {});
  });
  async function probeInfo(tabId, documentId) {
    const deadline = Date.now() + 5000;
    let last = null;
    while (Date.now() < deadline) {
      try {
        last = await chrome.tabs.sendMessage(tabId, { type: 'A1A2_PROBE_INFO' }, { documentId });
        if (last?.sender?.documentId) return last;
      } catch (_) {}
      await sleep(50);
    }
    throw new Error('probe sender report timeout: ' + JSON.stringify(last));
  }
  async function mainMutation(tabId, documentId, kind) {
    return chrome.scripting.executeScript({
      target: { tabId, documentIds: [documentId] },
      world: 'MAIN',
      func: (op) => {
        if (op === 'push') history.pushState({ fixture: 'push' }, '', '/a?push=1');
        else if (op === 'replace') history.replaceState({ fixture: 'replace' }, '', '/a?replace=1');
        else if (op === 'state') navigation.updateCurrentEntry({ state: { fixtureState: 'state-only' } });
        else if (op === 'hash') location.hash = 'fixture-hash';
        return { href: location.href, entryId: navigation?.currentEntry?.id || '' };
      },
      args: [kind]
    });
  }
  async function waitEvents(tabId, documentId, expected) {
    const deadline = Date.now() + 5000;
    let info = null;
    while (Date.now() < deadline) {
      info = await probeInfo(tabId, documentId);
      if ((info.events || []).length >= expected) return info;
      await sleep(50);
    }
    throw new Error('currententrychange event timeout: expected ' + expected + ', got ' + JSON.stringify(info?.events || []));
  }

  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: TEST_BASE + '/a', active: false });
    await waitComplete(tab.id);

    const injection = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['probe.js'] });
    assert(Array.isArray(injection) && injection.length >= 1, 'executeScript returns injection result');
    const top = injection.find((item) => item.frameId === 0) || injection[0];
    assert(Boolean(top.documentId), 'InjectionResult.documentId is populated', top);
    assert(top.frameId === 0, 'main-frame InjectionResult.frameId is zero', top);
    const oldDocumentId = top.documentId;

    let info = await probeInfo(tab.id, oldDocumentId);
    assert(info.navigationAvailable === true, 'Navigation API is visible in isolated content world', info);
    assert(info.sender.documentId === oldDocumentId, 'MessageSender.documentId matches InjectionResult.documentId', info.sender);
    assert(info.sender.documentLifecycle === 'active', 'MessageSender.documentLifecycle is active', info.sender);
    assert(info.sender.frameId === 0, 'MessageSender.frameId is top frame', info.sender);
    assert(info.currentEntryId === info.initialEntryId && Boolean(info.currentEntryId), 'Navigation.currentEntry.id is stable before navigation', info);
    const initialEntryId = info.currentEntryId;

    await mainMutation(tab.id, oldDocumentId, 'push');
    info = await waitEvents(tab.id, oldDocumentId, 1);
    assert(info.currentUrl.includes('?push=1'), 'main-world pushState is observed by isolated-world currententrychange', info.events);
    assert(info.currentEntryId !== initialEntryId, 'pushState creates a new navigation entry id', info);
    const pushEntryId = info.currentEntryId;

    await mainMutation(tab.id, oldDocumentId, 'replace');
    info = await waitEvents(tab.id, oldDocumentId, 2);
    assert(info.currentUrl.includes('?replace=1'), 'replaceState is observed by isolated-world currententrychange', info.events);
    assert(info.currentEntryId !== pushEntryId, 'replaceState replaces the current navigation entry id', info);
    const replaceEntryId = info.currentEntryId;

    await mainMutation(tab.id, oldDocumentId, 'state');
    info = await waitEvents(tab.id, oldDocumentId, 3);
    assert(info.currentEntryId === replaceEntryId, 'updateCurrentEntry state-only event keeps navigation entry id', info.events);
    assert(info.events[2]?.stateValue === 'state-only', 'state-only currententrychange is visible to isolated world', info.events[2]);

    await mainMutation(tab.id, oldDocumentId, 'hash');
    info = await waitEvents(tab.id, oldDocumentId, 4);
    assert(info.currentUrl.includes('#fixture-hash'), 'hash same-document navigation is observed', info.events);

    const exactBeforeNav = await chrome.tabs.sendMessage(tab.id, { type: 'A1A2_PROBE_INFO' }, { documentId: oldDocumentId });
    assert(exactBeforeNav?.ok === true, 'tabs.sendMessage exact documentId reaches current document');

    await chrome.tabs.update(tab.id, { url: TEST_BASE + '/b' });
    await waitComplete(tab.id);
    const injection2 = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['probe.js'] });
    const top2 = injection2.find((item) => item.frameId === 0) || injection2[0];
    const newDocumentId = top2.documentId;
    assert(Boolean(newDocumentId) && newDocumentId !== oldDocumentId, 'cross-document navigation changes documentId', { oldDocumentId, newDocumentId });
    const info2 = await probeInfo(tab.id, newDocumentId);
    assert(info2.sender.documentId === newDocumentId, 'new document sender matches new InjectionResult.documentId', info2.sender);

    let staleMessageRejected = false;
    try { await chrome.tabs.sendMessage(tab.id, { type: 'A1A2_PROBE_INFO' }, { documentId: oldDocumentId }); }
    catch (_) { staleMessageRejected = true; }
    assert(staleMessageRejected, 'tabs.sendMessage with stale documentId rejects instead of retargeting');

    let staleInjectionRejected = false;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id, documentIds: [oldDocumentId] }, func: () => true });
    } catch (_) { staleInjectionRejected = true; }
    assert(staleInjectionRejected, 'executeScript with stale documentId rejects instead of retargeting');

    const exactNew = await chrome.tabs.sendMessage(tab.id, { type: 'A1A2_PROBE_INFO' }, { documentId: newDocumentId });
    assert(exactNew?.ok === true, 'exact new documentId messaging succeeds');

    document.body.textContent = 'PASS ' + JSON.stringify({ cases, oldDocumentId, newDocumentId, sameDocumentEvents: info.events });
  } catch (error) {
    document.body.textContent = 'FAIL ' + JSON.stringify({ message: error?.message || String(error), stack: error?.stack || '', cases });
  } finally {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
  }
})();
`);

  const devtoolsFile = path.join(profileDir, 'DevToolsActivePort');
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profileDir}`, '--remote-debugging-port=0',
    `--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`,
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  chrome.stderr.on('data', (chunk) => { stderr += String(chunk); });

  let cdp = null;
  try {
    await waitForFile(devtoolsFile, 15000);
    const [portLine] = fs.readFileSync(devtoolsFile, 'utf8').trim().split(/\r?\n/);
    const debugPort = Number(portLine);
    if (!debugPort) throw new Error('Invalid DevTools port');

    const runnerUrl = `chrome-extension://${extensionId}/runner.html`;
    let target = null;
    let lastError = null;
    for (let attempt = 0; attempt < 50 && !target; attempt += 1) {
      try {
        target = await requestJson(debugPort, 'PUT', `/json/new?${encodeURIComponent(runnerUrl)}`);
      } catch (error) {
        lastError = error;
        await sleep(100);
      }
    }
    if (!target?.webSocketDebuggerUrl) throw lastError || new Error('Could not create extension runner target');

    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.call('Runtime.enable');

    const deadline = Date.now() + 30000;
    let text = '';
    while (Date.now() < deadline) {
      const result = await cdp.call('Runtime.evaluate', { expression: 'document.body.textContent', returnByValue: true });
      text = String(result?.result?.value || '');
      if (text.startsWith('PASS ') || text.startsWith('FAIL ')) break;
      await sleep(100);
    }
    if (!text.startsWith('PASS ')) {
      throw new Error(`Authority fixture did not pass: ${text || '[no result]'}\nChrome stderr:\n${stderr.slice(-4000)}`);
    }
    const payload = JSON.parse(text.slice(5));
    console.log(`A1/A2 Chrome authority fixture: PASS; cases=${payload.cases.length}`);
    for (const item of payload.cases) console.log(`PASS ${item.name}`);
    const stateOnly = payload.sameDocumentEvents?.find((item) => item.stateValue === 'state-only');
    console.log(`state-only-currententrychange-entry-id=${stateOnly?.id || ''}`);
    console.log(`old-document-id=${payload.oldDocumentId}`);
    console.log(`new-document-id=${payload.newDocumentId}`);
  } finally {
    cdp?.close();
    await stopChild(chrome);
    await new Promise((resolve) => server.close(resolve));
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch (_) {}
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
