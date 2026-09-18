const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const chromium = process.env.WEBCLIP_CHROME_FOR_TESTING || process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const MAX_BROWSER_TEST_MS = 120_000;

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitFor(fn, { timeoutMs = 20_000, intervalMs = 100, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  if (lastError) throw new Error(`${label} timed out: ${lastError.message}`);
  throw new Error(`${label} timed out after ${timeoutMs} ms`);
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
      if (message.error) {
        const error = new Error(`${pending.method}: ${message.error.message || JSON.stringify(message.error)}`);
        error.cdpCode = message.error.code;
        pending.reject(error);
      } else {
        pending.resolve(message.result || {});
      }
    }
  }

  failAll(error) {
    if (this.closed && !this.pending.size) return;
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
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async evaluate(sessionId, expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    }, sessionId, 60_000);
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
  constructor(browser, sessionId) {
    this.browser = browser;
    this.sessionId = sessionId;
  }
  evaluate(expression) { return this.browser.cdp.evaluate(this.sessionId, expression); }
  async close() {
    if (!this.sessionId) return;
    const id = this.sessionId;
    this.sessionId = null;
    await this.browser.cdp.send('Target.detachFromTarget', { sessionId: id }).catch(() => {});
  }
}

function normalizeDiskPath(input) {
  const text = String(input || '').trim();
  if (!text || text === '/') return '/';
  return '/' + text.split('/').filter(Boolean).join('/');
}

function immediateChildDirs(dirs, parent) {
  const base = normalizeDiskPath(parent);
  const prefix = base === '/' ? '/' : `${base}/`;
  const out = [];
  for (const item of dirs) {
    if (item === '/' || item === base || !item.startsWith(prefix)) continue;
    const rest = item.slice(prefix.length);
    if (!rest || rest.includes('/')) continue;
    out.push(item);
  }
  return out.sort();
}

async function startFixtureServer() {
  const dirs = new Set(['/']);
  const requests = [];
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const articleHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>P1-007 Browser Article</title>
<style>body{font-family:sans-serif;margin:40px}article{max-width:720px}aside{margin-top:30px}</style></head>
<body>
  <article id="article"><h1>P1-007 Browser Article</h1><p id="paragraph">Browser integration selection target with enough text for a real PDF render.</p><details open><summary>Details</summary><p>Printable details content.</p></details><img id="pixel" loading="lazy" src="/pixel.png" alt="fixture"></article>
  <aside id="noise">Unselected side content.</aside>
</body></html>`;

  const server = http.createServer(async (req, res) => {
    const base = `http://${req.headers.host || '127.0.0.1'}`;
    const url = new URL(req.url || '/', base);
    requests.push({ method: req.method, pathname: url.pathname, search: url.search, authorization: String(req.headers.authorization || '') });

    const json = (status, body) => {
      const data = Buffer.from(JSON.stringify(body));
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(data.length), 'cache-control': 'no-store' });
      res.end(data);
    };

    if (url.pathname === '/article.html') {
      const data = Buffer.from(articleHtml);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': String(data.length), 'cache-control': 'no-store' });
      res.end(data);
      return;
    }
    if (url.pathname === '/pixel.png') {
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': String(pixel.length), 'cache-control': 'no-store' });
      res.end(pixel);
      return;
    }
    if (url.pathname === '/v1/disk' && req.method === 'GET') {
      json(200, {
        total_space: 1024 * 1024 * 1024,
        used_space: 123456,
        trash_size: 0,
        user: { uid: 'p1-007-mock-uid', login: 'p1-007-mock', display_name: 'P1-007 Mock Account' }
      });
      return;
    }
    if (url.pathname === '/v1/disk/resources') {
      const diskPath = normalizeDiskPath(url.searchParams.get('path') || '/');
      if (req.method === 'PUT') {
        if (dirs.has(diskPath)) {
          json(409, { error: 'DiskPathPointsToExistentDirectoryError', description: 'Directory already exists', message: 'exists' });
          return;
        }
        dirs.add(diskPath);
        json(201, { type: 'dir', path: diskPath, name: diskPath.split('/').pop() || 'Disk' });
        return;
      }
      if (req.method === 'GET') {
        if (!dirs.has(diskPath)) {
          json(404, { error: 'DiskNotFoundError', description: 'Resource not found', message: 'not found' });
          return;
        }
        const children = immediateChildDirs(dirs, diskPath).map((child) => ({
          type: 'dir', path: child, name: child.split('/').pop()
        }));
        json(200, {
          type: 'dir', path: diskPath, name: diskPath === '/' ? 'Disk' : diskPath.split('/').pop(),
          _embedded: {
            items: children,
            total: children.length,
            limit: Number(url.searchParams.get('limit') || 100),
            offset: Number(url.searchParams.get('offset') || 0)
          }
        });
        return;
      }
    }
    json(404, { error: 'FixtureNotFound', message: `${req.method} ${url.pathname}` });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = Number(address.port);
  return {
    server,
    origin: `http://127.0.0.1:${port}`,
    articleUrl: `http://127.0.0.1:${port}/article.html`,
    apiBase: `http://127.0.0.1:${port}/v1/disk`,
    dirs,
    requests,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

async function prepareTestExtension(fixtureOrigin, apiBase, { mockYandex = true } = {}) {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'webclip-p1-007-ext-'));
  await fsp.cp(root, tempRoot, { recursive: true });

  if (mockYandex) {
    const swPath = path.join(tempRoot, 'service-worker.js');
    let sw = await fsp.readFile(swPath, 'utf8');
    const original = "const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';";
    assert(sw.includes(original), 'P1-007 browser test expects the production YANDEX_API_BASE constant');
    sw = sw.replace(original, `const YANDEX_API_BASE = ${JSON.stringify(apiBase)}; // P1-007 TEST COPY ONLY`);
    await fsp.writeFile(swPath, sw);
  }

  const manifestPath = path.join(tempRoot, 'manifest.json');
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  assert.strictEqual(manifest.version, '0.9.8', 'P1-007 must not change production manifest version');
  const fixturePermission = `${fixtureOrigin}/*`;
  if (!manifest.host_permissions.includes(fixturePermission)) manifest.host_permissions.push(fixturePermission);
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  return { path: tempRoot, cleanup: () => fsp.rm(tempRoot, { recursive: true, force: true }) };
}

async function launchChromium(extensionPath, { profilePath = '', preserveProfile = false } = {}) {
  const profile = profilePath || await fsp.mkdtemp(path.join(os.tmpdir(), 'webclip-p1-007-profile-'));
  const downloads = path.join(profile, 'Downloads');
  await fsp.mkdir(downloads, { recursive: true });
  const stdoutPath = path.join(profile, 'chromium.stdout.log');
  const stderrPath = path.join(profile, 'chromium.stderr.log');
  const stdout = fs.createWriteStream(stdoutPath);
  const stderr = fs.createWriteStream(stderrPath);
  const headed = process.env.WEBCLIP_CHROME_HEADED === '1';
  const args = [
    ...(!headed ? ['--headless=new'] : []),
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
    `--user-data-dir=${profile}`, 'about:blank'
  ];
  const proc = spawn(chromium, args, { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
  proc.stdout.pipe(stdout);
  proc.stderr.pipe(stderr);
  const cdp = new PipeCdpClient(proc);

  try {
    await cdp.send('Browser.getVersion', {}, undefined, 15_000);
    let loaded;
    try {
      loaded = await cdp.send('Extensions.loadUnpacked', { path: extensionPath }, undefined, 20_000);
    } catch (error) {
      if (/unpacked extensions is disabled by the administrator/i.test(error.message || '')) {
        const blocked = new Error(`P1-007_BROWSER_POLICY_BLOCKED: ${error.message}`);
        blocked.code = 'P1-007_BROWSER_POLICY_BLOCKED';
        throw blocked;
      }
      throw error;
    }
    const extensionId = String(loaded?.id || '').trim();
    assert(/^[a-p]{32}$/.test(extensionId), `Extensions.loadUnpacked must return a valid extension id, got: ${extensionId || '(empty)'}`);
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true }).catch(() => {});
    return {
      proc, cdp, profile, downloads, stderrPath, extensionId,
      async attachPage(url, label) {
        const created = await cdp.send('Target.createTarget', { url }, undefined, 15_000);
        assert(created?.targetId, `${label}: Target.createTarget must return targetId`);
        const attached = await cdp.send('Target.attachToTarget', { targetId: created.targetId, flatten: true }, undefined, 15_000);
        assert(attached?.sessionId, `${label}: Target.attachToTarget must return sessionId`);
        await cdp.send('Runtime.enable', {}, attached.sessionId, 15_000);
        const session = new CdpSession(this, attached.sessionId);
        await waitFor(async () => {
          const state = await session.evaluate('document.readyState');
          return state === 'complete' || state === 'interactive';
        }, { timeoutMs: 15_000, intervalMs: 100, label: `${label} ready` });
        return session;
      },
      async stop({ preserveProfile: keepProfile = preserveProfile, signal = 'SIGTERM' } = {}) {
        cdp.close();
        if (proc.exitCode == null) {
          if (signal === 'SIGKILL') {
            proc.kill('SIGKILL');
            await Promise.race([
              new Promise((resolve) => proc.once('exit', resolve)),
              sleep(1500)
            ]).catch(() => {});
          } else {
            proc.kill('SIGTERM');
            await Promise.race([
              new Promise((resolve) => proc.once('exit', resolve)),
              sleep(1500).then(() => { if (proc.exitCode == null) proc.kill('SIGKILL'); })
            ]).catch(() => {});
          }
        }
        stdout.end(); stderr.end();
        await sleep(100);
        if (!keepProfile) await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
      }
    };
  } catch (error) {
    cdp.close();
    if (proc.exitCode == null) proc.kill('SIGTERM');
    stdout.end(); stderr.end();
    const stderrText = await fsp.readFile(stderrPath, 'utf8').catch(() => '');
    if (!preserveProfile) await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
    if (stderrText && !error.browserStderr) error.browserStderr = stderrText.slice(-4000);
    throw error;
  }
}

function js(value) { return JSON.stringify(value); }

async function runBrowserIntegration() {
  let stage = 'bootstrap';
  const mark = (next) => {
    stage = String(next || 'unknown');
    console.log('P1_007_STAGE=' + stage);
  };
  assert(fs.existsSync(chromium), `Chromium binary not found: ${chromium}`);
  mark('fixture-start');
  const fixture = await startFixtureServer();
  let testExtension = null;
  let browser = null;
  let extensionId = '';
  let options = null;
  let journal = null;

  try {
    mark('extension-prepare');
    testExtension = await prepareTestExtension(fixture.origin, fixture.apiBase);
    mark('browser-launch');
    browser = await launchChromium(testExtension.path);
    mark('browser-launched');
    extensionId = browser.extensionId;
    mark('options-attach');
    options = await browser.attachPage(`chrome-extension://${extensionId}/popup.html`, 'popup extension controller');
    mark('options-attached');

    // Fresh profile already isolates data, but explicit reset makes retries in a
    // reused browser process deterministic and verifies extension storage APIs.
    mark('storage-reset');
    await options.evaluate(`(async () => {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
      return true;
    })()`);

    mark('selection-create-tab');
    const createdTab = await options.evaluate(`chrome.tabs.create({ url: ${js(fixture.articleUrl)}, active: true })`);
    const articleTabId = Number(createdTab?.id);
    assert(articleTabId > 0, 'article tab id required');

    mark('selection-wait-tab');
    await waitFor(async () => {
      const current = await options.evaluate(`chrome.tabs.get(${articleTabId})`);
      return current?.status === 'complete' ? current : null;
    }, { timeoutMs: 10_000, intervalMs: 50, label: 'P1-007 article tab load' });

    mark('selection-inject-content');
    await options.evaluate(`chrome.scripting.executeScript({ target: { tabId: ${articleTabId} }, files: ['content.js'] })`);

    mark('selection-send-start');
    const started = await options.evaluate(
      `chrome.tabs.sendMessage(${articleTabId}, { type: 'WEBCLIP_COMMAND', command: 'start' })`
    );

    mark('selection-click');
    const clickResult = await options.evaluate(`chrome.scripting.executeScript({
      target: { tabId: ${articleTabId} },
      func: () => {
        const article = document.getElementById('article');
        if (!article) return { clicked: false };
        article.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return {
          clicked: true,
          included: Boolean(article.getAttribute('data-webclip-pdf-include')),
          root: Boolean(document.getElementById('webclip-pdf-extension-root'))
        };
      }
    })`);
    const selection = { started, state: Array.isArray(clickResult) ? clickResult[0]?.result || null : null };
    mark('selection-returned');
    assert(selection?.started?.ok, 'selection start command must succeed in real Chromium');
    assert(selection?.state?.clicked && selection.state.included && selection.state.root, 'click selection must mark article and create WebClip UI');

    // ---- PDF integration (real chrome.debugger + Page.printToPDF + downloads) ----
    mark('pdf-dialog-start');
    const pdfStart = await options.evaluate(`(async () => {
      const tabId = ${articleTabId};
      const command = await chrome.tabs.sendMessage(tabId, { type: 'WEBCLIP_COMMAND', command: 'download' });
      const clicked = await chrome.scripting.executeScript({ target: { tabId }, func: () => {
        const root = document.getElementById('webclip-pdf-extension-root');
        const shadow = root?.shadowRoot;
        if (!shadow) return { ok: false, reason: 'no-shadow' };
        const buttons = [...shadow.querySelectorAll('.modal-actions button')];
        const proceed = buttons.find((button) => button.textContent.trim() === 'Сформировать PDF');
        if (!proceed) return { ok: false, reason: buttons.map((b) => b.textContent.trim()).join('|') };
        proceed.click();
        return { ok: true };
      }});
      return { command, clicked: clicked[0]?.result || null };
    })()`);
    assert(pdfStart?.command?.ok, 'download command must open file-comment dialog');
    assert(pdfStart?.clicked?.ok, `PDF proceed button must be clickable: ${pdfStart?.clicked?.reason || ''}`);

    mark('pdf-ui-wait');
    const pdfUi = await waitFor(async () => {
      const state = await options.evaluate(`(async () => {
        const result = await chrome.scripting.executeScript({ target: { tabId: ${articleTabId} }, func: () => {
          const shadow = document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          return { title: shadow?.querySelector('.modal h2')?.textContent || '', text: shadow?.querySelector('.modal p')?.textContent || '' };
        }});
        return result[0]?.result || null;
      })()`);
      if (/Не удалось сформировать PDF/.test(state?.title || '')) throw new Error(`${state.title}: ${state.text}`);
      if (/PDF передан в загрузки|PDF скачан/.test(state?.title || '')) return state;
      return null;
    }, { timeoutMs: 60_000, intervalMs: 250, label: 'WebClip PDF UI completion' });
    assert(/PDF/.test(pdfUi.title), 'PDF modal must reach completion state');

    mark('download-wait');
    const download = await waitFor(async () => {
      const items = await options.evaluate(`chrome.downloads.search({ orderBy: ['-startTime'], limit: 10 })`);
      const candidate = Array.isArray(items) ? items.find((item) => /\.pdf$/i.test(String(item.filename || ''))) : null;
      if (!candidate) return null;
      if (candidate.state === 'interrupted') throw new Error(`Chromium download interrupted: ${candidate.error || 'unknown'}`);
      return candidate.state === 'complete' ? candidate : null;
    }, { timeoutMs: 30_000, intervalMs: 200, label: 'PDF download complete' });
    assert(download?.filename && fs.existsSync(download.filename), 'completed PDF must exist on disk');
    const pdfStat = fs.statSync(download.filename);
    assert(pdfStat.size > 500, `generated PDF unexpectedly small: ${pdfStat.size}`);
    const pdfMagic = Buffer.alloc(5);
    const fd = fs.openSync(download.filename, 'r');
    fs.readSync(fd, pdfMagic, 0, pdfMagic.length, 0); fs.closeSync(fd);
    assert.strictEqual(pdfMagic.toString('ascii'), '%PDF-', 'downloaded file must be a real PDF');

    // ---- Journal integration: download completion -> durable entry -> rendered journal page ----
    mark('journal-list-wait');
    const journalList = await waitFor(async () => {
      const response = await options.evaluate(`chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_LIST', limit: 20 })`);
      if (!response?.ok) return null;
      const entry = Array.isArray(response.entries) ? response.entries.find((item) => item.url === fixture.articleUrl) : null;
      return entry ? { response, entry } : null;
    }, { timeoutMs: 20_000, intervalMs: 200, label: 'journal entry after PDF download' });
    assert.strictEqual(journalList.entry.destination, 'download', 'PDF browser integration must finalize a local-download journal entry');
    assert(Array.isArray(journalList.entry.selectionSnapshot?.includes) && journalList.entry.selectionSnapshot.includes.length >= 1, 'journal entry must retain selection snapshot');

    mark('journal-tab-open');
    const journalTab = await options.evaluate(`chrome.tabs.create({ url: chrome.runtime.getURL('journal.html?mode=all'), active: true })`);
    assert(Number(journalTab?.id) > 0, 'journal tab must open');
    journal = await browser.attachPage(`chrome-extension://${extensionId}/journal.html?mode=all`, 'journal extension page');
    const rendered = await waitFor(async () => {
      const value = await journal.evaluate(`({ ready: document.readyState, text: document.body?.innerText || '' })`);
      if (/P1-007 Browser Article/.test(value?.text || '')) return value;
      return null;
    }, { timeoutMs: 20_000, intervalMs: 200, label: 'journal UI render' });
    assert(rendered.text.includes('P1-007 Browser Article'), 'journal UI must render the durable browser-created entry');

    // ---- Yandex mock integration: session-only auth + real worker fetches + folder tree ----
    mark('yandex-mock');
    const yandex = await options.evaluate(`(async () => {
      const auth = await chrome.runtime.sendMessage({ type: 'WEBCLIP_YANDEX_SET_MANUAL_TOKEN', token: 'p1-007-browser-token' });
      if (!auth?.ok) return { stage: 'auth', auth };
      const root = await chrome.runtime.sendMessage({ type: 'WEBCLIP_YANDEX_SAVE_ROOT', rootPath: '/WebClipP1007' });
      if (!root?.ok) return { stage: 'root', auth, root };
      const tested = await chrome.runtime.sendMessage({ type: 'WEBCLIP_YANDEX_TEST' });
      const listed = await chrome.runtime.sendMessage({ type: 'WEBCLIP_YANDEX_LIST_FOLDERS', path: '/WebClipP1007' });
      const session = await chrome.storage.session.get('yandexAuth');
      const local = await chrome.storage.local.get('yandexAuth');
      return { stage: 'done', auth, root, tested, listed, sessionHasToken: Boolean(session?.yandexAuth?.accessToken), localHasToken: Boolean(local?.yandexAuth?.accessToken) };
    })()`);
    assert.strictEqual(yandex?.stage, 'done', `Yandex browser mock flow failed at ${yandex?.stage || 'unknown'}`);
    assert.strictEqual(yandex.tested?.account?.uid, 'p1-007-mock-uid', 'Yandex account must come from the HTTP mock');
    assert(yandex.sessionHasToken, 'Yandex access token must remain available in session storage during test');
    assert.strictEqual(yandex.localHasToken, false, 'Yandex access token must not be persisted to local storage');
    const folderNames = new Set((yandex.listed?.folders || []).map((item) => item.name));
    assert(folderNames.has('Upload') && folderNames.has('ReadmeLater') && folderNames.has('Backup'), 'mocked Yandex service folder tree must be created and listed');
    assert(fixture.requests.some((item) => item.pathname === '/v1/disk' && item.authorization === 'OAuth p1-007-browser-token'), 'mock server must receive OAuth authorization from real worker fetch');
    assert(fixture.requests.some((item) => item.pathname === '/v1/disk/resources' && item.method === 'PUT'), 'mock server must receive real folder creation requests');

    mark('complete');
    return {
      extensionId,
      articleTabId,
      pdfBytes: pdfStat.size,
      pdfFilename: path.basename(download.filename),
      journalEntryId: journalList.entry.id,
      yandexRequests: fixture.requests.length,
      yandexFolders: [...folderNames].sort()
    };
  } catch (error) {
    console.error('P1_007_FAILURE_STAGE=' + stage);
    console.error('P1_007_BROWSER_PROCESS=' + JSON.stringify({
      exitCode: browser?.proc?.exitCode ?? null,
      signalCode: browser?.proc?.signalCode ?? null,
      killed: Boolean(browser?.proc?.killed)
    }));
    const targets = await browser?.cdp?.send('Target.getTargets', {}, undefined, 5000).catch(() => null);
    if (targets?.targetInfos) {
      console.error('P1_007_TARGETS=' + JSON.stringify(targets.targetInfos.map((item) => ({
        targetId: item.targetId,
        type: item.type,
        url: item.url,
        title: item.title,
        attached: item.attached
      }))));
    }
    throw error;
  } finally {
    journal?.close();
    options?.close();
    await browser?.stop().catch(() => {});
    await testExtension?.cleanup().catch(() => {});
    await fixture.close().catch(() => {});
  }
}

module.exports = Object.freeze({
  sleep,
  waitFor,
  startFixtureServer,
  prepareTestExtension,
  launchChromium,
  js
});

if (require.main === module) {
  (async () => {
    const timer = setTimeout(() => {
      console.error(`P1-007 browser integration exceeded ${MAX_BROWSER_TEST_MS} ms`);
      process.exit(2);
    }, MAX_BROWSER_TEST_MS);
    timer.unref?.();
    try {
      const result = await runBrowserIntegration();
      console.log('P1-007 real Chromium browser integration OK');
      console.log(JSON.stringify(result, null, 2));
    } finally {
      clearTimeout(timer);
    }
  })().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
