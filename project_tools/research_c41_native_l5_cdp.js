const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const assert = require('assert');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const chromium = process.env.WEBCLIP_CHROME_FOR_TESTING || process.env.CHROMIUM_BIN || '/usr/bin/google-chrome';

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitFor(fn, { timeoutMs = 20_000, intervalMs = 100, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      last = await fn();
      if (last) return last;
    } catch (error) {
      last = error?.message || String(error);
    }
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out; last=${JSON.stringify(last)}`);
}

class PipeCdpClient {
  constructor(proc) {
    this.proc = proc;
    this.input = proc.stdio[3];
    this.output = proc.stdio[4];
    this.seq = 0;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.closed = false;
    this.output.on('data', (chunk) => this.onData(chunk));
    this.output.on('error', (error) => this.failAll(error));
    this.output.on('close', () => this.failAll(new Error('CDP pipe closed')));
    proc.on('exit', (code, signal) => this.failAll(new Error(`Chromium exited during CDP operation: code=${code} signal=${signal || ''}`)));
  }
  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const nul = this.buffer.indexOf(0);
      if (nul < 0) return;
      const raw = this.buffer.subarray(0, nul).toString('utf8');
      this.buffer = this.buffer.subarray(nul + 1);
      if (!raw) continue;
      let message;
      try { message = JSON.parse(raw); } catch (_) { continue; }
      if (!message.id) continue;
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message || JSON.stringify(message.error)}`));
      else pending.resolve(message.result || {});
    }
  }
  failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
  send(method, params = {}, sessionId = undefined, timeoutMs = 20_000) {
    if (this.closed || !this.input || this.input.destroyed) return Promise.reject(new Error(`CDP pipe unavailable for ${method}`));
    const id = ++this.seq;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, method, timer });
      this.input.write(Buffer.from(JSON.stringify(payload) + '\0', 'utf8'), (error) => {
        if (!error) return;
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error);
      });
    });
  }
  async evaluate(sessionId, expression, timeoutMs = 60_000) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    }, sessionId, timeoutMs);
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime.evaluate failed';
      throw new Error(text);
    }
    return result.result?.value;
  }
  close() {
    this.closed = true;
    this.failAll(new Error('CDP client closed'));
    try { this.input?.end(); } catch (_) {}
  }
}

class CdpSession {
  constructor(browser, sessionId, targetId) {
    this.browser = browser;
    this.sessionId = sessionId;
    this.targetId = targetId;
  }
  evaluate(expression, timeoutMs) { return this.browser.cdp.evaluate(this.sessionId, expression, timeoutMs); }
  async close() {
    if (!this.sessionId) return;
    const id = this.sessionId;
    this.sessionId = null;
    await this.browser.cdp.send('Target.detachFromTarget', { sessionId: id }).catch(() => {});
  }
}

function shell(program, args = [], { allowFailure = false } = {}) {
  try {
    return execFileSync(program, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFailure) return String(error.stdout || '').trim();
    throw error;
  }
}

function windows() {
  const text = shell('wmctrl', ['-l', '-x'], { allowFailure: true });
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => ({
    id: line.split(/\s+/)[0] || '',
    line
  }));
}

function activeWindow() {
  const id = shell('xdotool', ['getactivewindow'], { allowFailure: true });
  if (!id) return { id: '', name: '', klass: '' };
  return {
    id,
    name: shell('xdotool', ['getwindowname', id], { allowFailure: true }),
    klass: shell('xdotool', ['getwindowclassname', id], { allowFailure: true })
  };
}

async function waitNativeDialog(before, timeoutMs = 15_000) {
  const beforeIds = new Set(before.map((item) => item.id));
  return waitFor(async () => {
    const now = windows();
    const fresh = now.filter((item) => !beforeIds.has(item.id));
    const active = activeWindow();
    const blob = [...fresh.map((x) => x.line), ...now.map((x) => x.line), active.name, active.klass].join('\n').toLowerCase();
    const semantic = ['save', 'file chooser', 'file picker', 'сохран'].some((token) => blob.includes(token));
    return (fresh.length || semantic) ? { before, windows: now, fresh, active, semantic } : null;
  }, { timeoutMs, intervalMs: 100, label: 'real native Save As window' });
}

function dialogStillPresent(observed) {
  const current = windows();
  const ids = new Set(current.map((x) => x.id));
  if ((observed.fresh || []).some((x) => ids.has(x.id))) return true;
  const active = activeWindow();
  const blob = `${active.name} ${active.klass}`.toLowerCase();
  return ['save', 'file chooser', 'file picker', 'сохран'].some((token) => blob.includes(token));
}

function press(key) {
  shell('xdotool', ['key', '--clearmodifiers', key]);
}

async function launchBrowser(label) {
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(), `webclip-c41-${label}-profile-`));
  const stdoutPath = path.join(profile, 'chrome.stdout.log');
  const stderrPath = path.join(profile, 'chrome.stderr.log');
  const stdout = fs.createWriteStream(stdoutPath);
  const stderr = fs.createWriteStream(stderrPath);
  const args = [
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
    '--window-size=1280,900', `--user-data-dir=${profile}`, 'about:blank'
  ];
  const proc = spawn(chromium, args, { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
  proc.stdout.pipe(stdout);
  proc.stderr.pipe(stderr);
  const cdp = new PipeCdpClient(proc);
  try {
    const version = await cdp.send('Browser.getVersion', {}, undefined, 15_000);
    const loaded = await cdp.send('Extensions.loadUnpacked', { path: root }, undefined, 20_000);
    const extensionId = String(loaded?.id || '').trim();
    assert(/^[a-p]{32}$/.test(extensionId), `invalid unpacked extension id: ${extensionId || '(empty)'}`);
    const browser = {
      proc, cdp, profile, stdout, stderr, stdoutPath, stderrPath, extensionId, version,
      async attachPage(url, pageLabel) {
        const created = await cdp.send('Target.createTarget', { url }, undefined, 15_000);
        assert(created?.targetId, `${pageLabel}: targetId missing`);
        const attached = await cdp.send('Target.attachToTarget', { targetId: created.targetId, flatten: true }, undefined, 15_000);
        assert(attached?.sessionId, `${pageLabel}: sessionId missing`);
        await cdp.send('Runtime.enable', {}, attached.sessionId, 15_000);
        const session = new CdpSession(browser, attached.sessionId, created.targetId);
        await waitFor(async () => {
          const state = await session.evaluate('document.readyState');
          return state === 'complete' || state === 'interactive';
        }, { timeoutMs: 15_000, intervalMs: 100, label: `${pageLabel} ready` });
        return session;
      },
      async stop() {
        cdp.close();
        if (proc.exitCode == null) {
          proc.kill('SIGTERM');
          await Promise.race([
            new Promise((resolve) => proc.once('exit', resolve)),
            sleep(1500).then(() => { if (proc.exitCode == null) proc.kill('SIGKILL'); })
          ]).catch(() => {});
        }
        stdout.end(); stderr.end();
        await sleep(100);
        await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
      }
    };
    return browser;
  } catch (error) {
    cdp.close();
    if (proc.exitCode == null) proc.kill('SIGTERM');
    stdout.end(); stderr.end();
    const stderrText = await fsp.readFile(stderrPath, 'utf8').catch(() => '');
    error.browserStderr = stderrText.slice(-6000);
    throw error;
  }
}

async function journalSession(browser) {
  const session = await browser.attachPage(`chrome-extension://${browser.extensionId}/journal.html`, 'Journal');
  await waitFor(async () => await session.evaluate("document.readyState === 'complete' && !!document.getElementById('exportFile')"), {
    timeoutMs: 20_000, label: 'Journal controls'
  });
  await sleep(300);
  return session;
}

async function storageSnapshot(session) {
  return await session.evaluate('(async()=>await chrome.storage.session.get(null))()');
}

function saveAsRows(snapshot) {
  return Object.fromEntries(Object.entries(snapshot || {}).filter(([key]) => key.startsWith('webclipPreparedSaveAs')));
}

async function downloads(session) {
  return await session.evaluate('(async()=>await chrome.downloads.search({}))()');
}

async function readOperation(session, operationId) {
  return await session.evaluate(`(async()=>await new Promise((resolve,reject)=>{
    const req=indexedDB.open('WebClipOperationLogs',2);
    req.onerror=()=>reject(req.error||new Error('oplog open failed'));
    req.onsuccess=()=>{const db=req.result;const tx=db.transaction('operations','readonly');const get=tx.objectStore('operations').get(${JSON.stringify(operationId)});get.onsuccess=()=>resolve(get.result||null);get.onerror=()=>reject(get.error||new Error('oplog get failed'));tx.oncomplete=()=>db.close();};
  }))()`);
}

function compactDownload(row) {
  const out = {};
  for (const key of ['id', 'state', 'filename', 'error', 'exists', 'bytesReceived', 'totalBytes', 'fileSize', 'startTime', 'endTime']) out[key] = row?.[key] ?? null;
  return out;
}

async function beginExport(session) {
  const before = windows();
  await session.evaluate("document.getElementById('exportFile').click(); true");
  const operationId = await waitFor(async () => {
    const id = await session.evaluate("document.getElementById('lastOperationId')?.textContent?.trim() || ''");
    return id || null;
  }, { timeoutMs: 12_000, label: 'Journal export operationId' });
  const nativeDialog = await waitNativeDialog(before, 15_000);
  return { operationId, nativeDialog };
}

async function waitExportIdle(session, timeoutMs = 20_000) {
  return waitFor(async () => await session.evaluate("!document.getElementById('exportFile').disabled"), {
    timeoutMs, label: 'Journal export busy reset'
  });
}

async function stopServiceWorker(browser) {
  const target = await waitFor(async () => {
    const all = await browser.cdp.send('Target.getTargets');
    return (all.targetInfos || []).find((info) => info.type === 'service_worker' && String(info.url || '').startsWith(`chrome-extension://${browser.extensionId}/`) && String(info.url || '').endsWith('/service-worker.js')) || null;
  }, { timeoutMs: 10_000, label: 'extension service worker target' });
  const attached = await browser.cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  await browser.cdp.send('Runtime.enable', {}, attached.sessionId);
  const value = await browser.cdp.evaluate(attached.sessionId, "(()=>{self.close();return 'close-called';})()");
  await browser.cdp.send('Target.detachFromTarget', { sessionId: attached.sessionId }).catch(() => {});
  await sleep(500);
  return { targetId: target.targetId, url: target.url, closeResult: value };
}

async function acceptDialog(observed) {
  const keys = [];
  for (const key of ['Return', 'Return', 'alt+s', 'Return']) {
    press(key); keys.push(key); await sleep(500);
    if (!dialogStillPresent(observed)) return keys;
  }
  throw new Error(`native chooser remained open after accept keys; active=${JSON.stringify(activeWindow())}`);
}

async function cancelCase() {
  const browser = await launchBrowser('cancel');
  try {
    const session = await journalSession(browser);
    const { operationId, nativeDialog } = await beginExport(session);
    const during = saveAsRows(await storageSnapshot(session));
    press('Escape');
    await waitExportIdle(session);
    await sleep(300);
    const rows = await downloads(session);
    const operation = await readOperation(session, operationId);
    const statusText = await session.evaluate("document.getElementById('status')?.textContent?.trim() || ''");
    return {
      operationId,
      nativeDialog,
      duringSessionRows: during,
      afterSessionRows: saveAsRows(await storageSnapshot(session)),
      downloads: (rows || []).map(compactDownload),
      operation,
      statusText,
      dialogRemaining: dialogStillPresent(nativeDialog)
    };
  } finally {
    await browser.stop();
  }
}

async function workerRestartSuccessCase() {
  const browser = await launchBrowser('worker-restart-success');
  try {
    const session = await journalSession(browser);
    const { operationId, nativeDialog } = await beginExport(session);
    const during = saveAsRows(await storageSnapshot(session));
    const workerStop = await stopServiceWorker(browser);
    const acceptKeys = await acceptDialog(nativeDialog);
    await waitExportIdle(session, 25_000);
    const terminal = await waitFor(async () => {
      const rows = await downloads(session);
      return (rows || []).find((row) => row.state === 'complete' || row.state === 'interrupted') || null;
    }, { timeoutMs: 25_000, label: 'native DownloadItem terminality' });
    const allDownloads = await downloads(session);
    const operation = await readOperation(session, operationId);
    const after = saveAsRows(await storageSnapshot(session));
    const filename = String(terminal.filename || '');
    let physical = { path: filename, exists: false, bytes: 0, sha256: '' };
    if (filename) {
      try {
        const data = await fsp.readFile(filename);
        physical = { path: filename, exists: true, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
      } catch (_) {}
    }
    const statusText = await session.evaluate("document.getElementById('status')?.textContent?.trim() || ''");
    return {
      operationId,
      nativeDialog,
      duringSessionRows: during,
      workerStop,
      acceptKeys,
      downloads: (allDownloads || []).map(compactDownload),
      terminalDownload: compactDownload(terminal),
      operation,
      afterSessionRows: after,
      physicalFile: physical,
      statusText,
      dialogRemaining: dialogStillPresent(nativeDialog)
    };
  } finally {
    await browser.stop();
  }
}

async function main() {
  assert(process.env.DISPLAY, 'DISPLAY is required for native X11 evidence');
  for (const tool of ['wmctrl', 'xdotool']) assert(shell('sh', ['-lc', `command -v ${tool}`], { allowFailure: true }), `${tool} unavailable`);
  const cancel = await cancelCase();
  const success = await workerRestartSuccessCase();
  const source = {};
  for (const file of ['manifest.json', 'service-worker.js', 'prepared-save-as.js', 'journal.js']) {
    source[file] = crypto.createHash('sha256').update(await fsp.readFile(path.join(root, file))).digest('hex');
  }
  const result = {
    chromeVersion: shell(chromium, ['--version'], { allowFailure: true }),
    display: process.env.DISPLAY,
    source,
    cancelCase: cancel,
    workerRestartSuccessCase: success,
    evidenceBoundary: {
      nativeChooser: 'real Chrome/OS X11 file chooser; xdotool supplies keyboard input only',
      workerRestart: 'real MV3 service worker self.close() while chooser pending',
      browserRestart: false,
      automaticResponseLoss: false,
      ownerPageRestart: false
    }
  };
  const canonical = JSON.stringify(result, Object.keys(result).sort());
  result.resultSha256 = crypto.createHash('sha256').update(canonical).digest('hex');
  console.log('C41_NATIVE_RESULT_JSON=' + JSON.stringify(result));

  assert(cancel.nativeDialog.fresh.length || cancel.nativeDialog.semantic, 'cancel: native chooser not observed');
  assert(!cancel.dialogRemaining, 'cancel: native chooser still present');
  assert(success.nativeDialog.fresh.length || success.nativeDialog.semantic, 'success: native chooser not observed');
  assert.strictEqual(success.workerStop.closeResult, 'close-called', 'service worker close not executed');
  assert(!success.dialogRemaining, 'success: native chooser still present');
  assert.strictEqual(success.terminalDownload.state, 'complete', 'success DownloadItem not complete');
  assert(success.physicalFile.exists && success.physicalFile.bytes > 0, 'physical saved file missing');
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
