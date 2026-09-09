'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const CHROME_BIN = process.env.CHROME_BIN;
if (!CHROME_BIN) throw new Error('CHROME_BIN is required');

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }

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

async function openTarget(debugPort, url) {
  let lastError = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const target = await requestJson(debugPort, 'PUT', `/json/new?${encodeURIComponent(url)}`);
      if (target?.webSocketDebuggerUrl) return target;
    } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw lastError || new Error(`Could not create target: ${url}`);
}

async function waitReady(cdp, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await cdp.call('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (result?.result?.value === 'complete') return;
    await sleep(50);
  }
  throw new Error('document.readyState timeout');
}

async function runPrintFixture(debugPort, url) {
  const target = await openTarget(debugPort, url);
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    await waitReady(cdp);
    const result = await cdp.call('Page.printToPDF', {
      landscape: false,
      displayHeaderFooter: false,
      printBackground: true,
      preferCSSPageSize: true,
      transferMode: 'ReturnAsStream'
    });
    const stream = String(result?.stream || '');
    if (!stream) throw new Error('Page.printToPDF did not return a stream');
    if (String(result?.data || '') !== '') throw new Error('ReturnAsStream unexpectedly returned inline data');

    const chunks = [];
    let reads = 0;
    let total = 0;
    let eof = false;
    while (!eof) {
      const chunk = await cdp.call('IO.read', { handle: stream, size: 4096 });
      reads += 1;
      eof = Boolean(chunk?.eof);
      const data = String(chunk?.data || '');
      if (!data) continue;
      if (chunk?.base64Encoded !== true) throw new Error('PDF IO.read chunk was not base64Encoded');
      const bytes = Buffer.from(data, 'base64');
      total += bytes.length;
      chunks.push(bytes);
      if (total > 8 * 1024 * 1024) throw new Error('Fixture PDF unexpectedly exceeded 8 MiB');
    }
    await cdp.call('IO.close', { handle: stream });
    const pdf = Buffer.concat(chunks);
    if (!pdf.length) throw new Error('Empty fixture PDF');
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Fixture bytes do not start with %PDF-');
    if (reads < 2) throw new Error(`Expected multiple sequential IO.read calls, got ${reads}`);
    return { byteLength: pdf.length, sha256: sha256(pdf), reads, prefix: pdf.subarray(0, 8).toString('ascii') };
  } finally {
    cdp.close();
  }
}

async function runExtensionFixture(debugPort, extensionId) {
  const target = await openTarget(debugPort, `chrome-extension://${extensionId}/runner.html`);
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.call('Runtime.enable');
    await waitReady(cdp);
    const deadline = Date.now() + 15000;
    let text = '';
    while (Date.now() < deadline) {
      const result = await cdp.call('Runtime.evaluate', { expression: 'document.body.textContent', returnByValue: true });
      text = String(result?.result?.value || '');
      if (text.startsWith('PASS ') || text.startsWith('FAIL ')) break;
      await sleep(100);
    }
    if (!text.startsWith('PASS ')) throw new Error(`IndexedDB fixture failed: ${text || '[no result]'}`);
    return JSON.parse(text.slice(5));
  } finally {
    cdp.close();
  }
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-a3b1-'));
  const extDir = path.join(root, 'extension');
  const profileDir = path.join(root, 'profile');
  fs.mkdirSync(extDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const longBody = Array.from({ length: 3000 }, (_, i) => `<p>WebClip A3/B1 physical PDF row ${String(i + 1).padStart(4, '0')} — exact stream receipt.</p>`).join('');
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font:12px Arial}</style><h1>A3/B1 fixture</h1>${longBody}`);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const pageUrl = `http://127.0.0.1:${server.address().port}/fixture`;

  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
  const publicDer = publicKey.export({ type: 'spki', format: 'der' });
  const extensionId = extensionIdFromPublicKey(publicDer);
  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'WebClip A3 B1 IndexedDB fixture',
    version: '1.0.0',
    key: publicDer.toString('base64')
  }, null, 2));
  fs.writeFileSync(path.join(extDir, 'runner.html'), '<!doctype html><meta charset="utf-8"><body>RUNNING<script src="runner.js"></script></body>');
  fs.writeFileSync(path.join(extDir, 'runner.js'), `
(async () => {
  const cases = [];
  const pass = (name) => cases.push(name);
  const assert = (value, name) => { if (!value) throw new Error(name); pass(name); };
  const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('A3B1AtomicSealFixture', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('payload')) db.createObjectStore('payload', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
  const txDone = (tx, expectAbort = false) => new Promise((resolve, reject) => {
    tx.oncomplete = () => expectAbort ? reject(new Error('transaction unexpectedly committed')) : resolve('complete');
    tx.onabort = () => expectAbort ? resolve('abort') : reject(tx.error || new Error('transaction aborted'));
    tx.onerror = () => {};
  });
  const readPair = async (db, key) => {
    const tx = db.transaction(['payload','meta'], 'readonly');
    const pReq = tx.objectStore('payload').get(key);
    const mReq = tx.objectStore('meta').get(key);
    const result = await new Promise((resolve, reject) => {
      let p, m, count = 0;
      const done = () => { if (++count === 2) resolve({ p, m }); };
      pReq.onsuccess = () => { p = pReq.result || null; done(); };
      mReq.onsuccess = () => { m = mReq.result || null; done(); };
      pReq.onerror = () => reject(pReq.error); mReq.onerror = () => reject(mReq.error);
    });
    await txDone(tx);
    return result;
  };
  const digestHex = async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return [...digest].map((b) => b.toString(16).padStart(2,'0')).join('');
  };
  try {
    let db = await openDb();
    const bytes1 = new Blob(['%PDF-fixture-A'], { type: 'application/pdf' });
    const hash1 = await digestHex(bytes1);
    let tx = db.transaction(['payload','meta'], 'readwrite');
    tx.objectStore('payload').add({ key:'G1', blob:bytes1 });
    tx.objectStore('meta').add({ key:'G1', generation:'G1', size:bytes1.size, sha256:hash1, sealed:true });
    await txDone(tx);
    pass('create-once payload+meta transaction commits');

    tx = db.transaction(['payload','meta'], 'readwrite');
    tx.objectStore('payload').add({ key:'G2', blob:new Blob(['orphan']) });
    tx.objectStore('meta').add({ key:'G1', generation:'G1-duplicate' });
    await txDone(tx, true);
    pass('duplicate add aborts whole cross-store transaction');
    let pair = await readPair(db, 'G2');
    assert(!pair.p && !pair.m, 'aborted transaction leaves no payload-only orphan');

    const bytes3 = new Blob(['%PDF-fixture-G3-exact'], { type: 'application/pdf' });
    const hash3 = await digestHex(bytes3);
    tx = db.transaction(['payload','meta'], 'readwrite');
    tx.objectStore('payload').add({ key:'G3', blob:bytes3 });
    tx.objectStore('meta').add({ key:'G3', generation:'G3', size:bytes3.size, sha256:hash3, sealed:true });
    await txDone(tx);
    db.close();
    db = await openDb();
    pair = await readPair(db, 'G3');
    assert(Boolean(pair.p?.blob && pair.m?.sealed), 'committed generation survives DB close/reopen');
    assert(pair.p.blob.size === pair.m.size, 'reopened payload size matches metadata');
    assert((await digestHex(pair.p.blob)) === pair.m.sha256, 'reopened payload SHA256 matches metadata');

    tx = db.transaction(['payload','meta'], 'readwrite');
    tx.objectStore('payload').add({ key:'G3', blob:new Blob(['different-same-key']) });
    tx.objectStore('meta').add({ key:'G3', generation:'G3', sealed:true });
    await txDone(tx, true);
    pass('second create of sealed generation aborts rather than replaces');
    pair = await readPair(db, 'G3');
    assert((await digestHex(pair.p.blob)) === hash3, 'duplicate create leaves original exact bytes unchanged');
    db.close();
    document.body.textContent = 'PASS ' + JSON.stringify({ cases, hash3, size3: bytes3.size });
  } catch (error) {
    document.body.textContent = 'FAIL ' + JSON.stringify({ message:error?.message || String(error), stack:error?.stack || '', cases });
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

  try {
    await waitForFile(devtoolsFile);
    const [portLine] = fs.readFileSync(devtoolsFile, 'utf8').trim().split(/\r?\n/);
    const debugPort = Number(portLine);
    if (!debugPort) throw new Error('Invalid DevTools port');

    const print = await runPrintFixture(debugPort, pageUrl);
    const idb = await runExtensionFixture(debugPort, extensionId);
    console.log(`A3/B1 Chrome render/seal fixture: PASS; printBytes=${print.byteLength}; printReads=${print.reads}; printSha256=${print.sha256}; idbCases=${idb.cases.length}; idbSha256=${idb.hash3}`);
    console.log(`PDF-prefix=${print.prefix}`);
    for (const item of idb.cases) console.log(`PASS ${item}`);
  } catch (error) {
    throw new Error(`${error?.stack || error}\nChrome stderr:\n${stderr.slice(-5000)}`);
  } finally {
    try { chrome.kill('SIGTERM'); } catch (_) {}
    await Promise.race([
      new Promise((resolve) => chrome.once('exit', resolve)),
      sleep(2000)
    ]);
    await new Promise((resolve) => server.close(resolve));
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (_) {}
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
