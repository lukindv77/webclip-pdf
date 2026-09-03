#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = process.env.C46_SOURCE_BASELINE || '';
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const CONTENT = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
const GUARD = fs.readFileSync(path.join(ROOT, 'pdf-print-guard.js'), 'utf8');
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const TITLE = 'C46 debugger guard handshake fixture';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sourceChecks() {
  const result = {
    manifestVersion: MANIFEST.version,
    debuggerPermission: (MANIFEST.permissions || []).includes('debugger'),
    guardRenderStateType: GUARD.includes("const STATE_TYPE = 'WEBCLIP_PRINT_RENDER_STATE'"),
    guardUsesTabsMessage: GUARD.includes('tabsApi.sendMessage(tabId, { type: STATE_TYPE'),
    guardDelegatesRawPrint: GUARD.includes('printResult = await rawSendCommand(debuggee, method, params)'),
    contentRenderStateListener: CONTENT.includes("message?.type === 'WEBCLIP_PRINT_RENDER_STATE'"),
    productionGeneratePdfBlob: WORKER.includes('async function generatePdfBlob(tabId)'),
    activeRegistry: WORKER.includes('debuggerActiveTabs = new Set()'),
    lateRegistry: WORKER.includes('debuggerLateAttachCleanupByTab = new Map()'),
    pendingDetachRegistry: WORKER.includes('debuggerPendingDetachByTab = new Map()'),
    pendingActualRegistry: WORKER.includes('debuggerPendingActualSettlements = new Set()')
  };
  for (const [key, value] of Object.entries(result)) {
    if (key === 'manifestVersion') continue;
    assert.equal(value, true, `source check failed: ${key}`);
  }
  return result;
}

async function startServer() {
  let resolveReport;
  let rejectReport;
  const report = new Promise((resolve, reject) => {
    resolveReport = resolve;
    rejectReport = reject;
  });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/fixture') {
      const body = `<!doctype html><meta charset="utf-8"><title>${TITLE}</title><main><h1>C46_PRODUCTION_DEBUGGER</h1><a href="https://example.com/ok">safe link</a><p>Selected readable fixture text.</p></main>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': Buffer.byteLength(body) });
      res.end(body);
      return;
    }
    if (url.pathname === '/report') {
      try {
        resolveReport(JSON.parse(url.searchParams.get('data') || '{}'));
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('ok');
      } catch (error) {
        rejectReport(error);
        res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('bad report');
      }
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return {
    server,
    report,
    fixtureUrl: `http://127.0.0.1:${port}/fixture`,
    reportUrl: `http://127.0.0.1:${port}/report`
  };
}

function makeTempExtension(server) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c46-guard-handshake-'));
  const extension = path.join(root, 'extension');
  fs.cpSync(ROOT, extension, {
    recursive: true,
    filter(source) {
      const rel = path.relative(ROOT, source);
      if (!rel) return true;
      return !['.git', 'node_modules'].includes(rel.split(path.sep)[0]);
    }
  });

  // Test-only fixture admission. This deliberately bypasses native optional-host
  // permission UI so this tranche isolates the debugger/render-guard boundary.
  // The injected script bytes are the unmodified production content.js.
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), 'http://127.0.0.1/*'])];
  manifest.content_scripts = [
    ...(manifest.content_scripts || []),
    { matches: ['http://127.0.0.1/*'], js: ['content.js'], run_at: 'document_start' }
  ];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const sidecar = `\n// C46 test-only driver appended to temporary unpacked copy only.\n(async () => {\n  await new Promise(r => setTimeout(r, 3000));\n  const out = { ok: false, stage: 'start' };\n  let tab = null;\n  const debuggee = () => ({ tabId: tab.id });\n  try {\n    out.guardInstalled = Boolean(globalThis.__webclipPdfPrintGuardInstalled);\n    out.stage = 'tab-create';\n    tab = await chrome.tabs.create({ url: ${JSON.stringify(server.fixtureUrl)}, active: false });\n    out.tabId = tab.id;\n    out.stage = 'tab-load';\n    for (let i = 0; i < 150; i++) {\n      const current = await chrome.tabs.get(tab.id);\n      if (current.status === 'complete') break;\n      if (i === 149) throw new Error('fixture load timeout');\n      await new Promise(r => setTimeout(r, 100));\n    }\n    await new Promise(r => setTimeout(r, 300));\n    out.fixtureTitle = (await chrome.tabs.get(tab.id)).title || '';\n    out.stage = 'listener-handshake';\n    const listener = await chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_PRINT_RENDER_STATE', hidden: false });\n    out.renderStateListenerOk = listener?.ok === true;\n    out.stage = 'debugger-before';\n    out.debuggerAttachedBefore = Boolean((await chrome.debugger.getTargets()).find(x => x.tabId === tab.id)?.attached);\n    out.stage = 'production-generate';\n    const blob = await generatePdfBlob(tab.id);\n    const bytes = new Uint8Array(await blob.arrayBuffer());\n    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));\n    out.pdfBytes = bytes.length;\n    out.pdfSha256 = [...digest].map(x => x.toString(16).padStart(2, '0')).join('');\n    out.pdfHeaderHex = [...bytes.subarray(0, 8)].map(x => x.toString(16).padStart(2, '0')).join('');\n    out.stage = 'listener-after';\n    const listenerAfter = await chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_PRINT_RENDER_STATE', hidden: false });\n    out.renderStateListenerAfterOk = listenerAfter?.ok === true;\n    out.stage = 'debugger-after';\n    out.debuggerAttachedAfter = Boolean((await chrome.debugger.getTargets()).find(x => x.tabId === tab.id)?.attached);\n    out.debuggerActiveSetAfter = debuggerActiveTabs.has(tab.id);\n    out.debuggerLateAttachCleanupAfter = debuggerLateAttachCleanupByTab.has(tab.id);\n    out.debuggerPendingDetachAfter = debuggerPendingDetachByTab.has(tab.id);\n    out.debuggerPendingActualSettlementCountAfter = debuggerPendingActualSettlements.size;\n    out.ok = true;\n    out.stage = 'done';\n  } catch (error) {\n    out.error = String(error?.stack || error?.message || error);\n    try {\n      if (tab?.id) out.debuggerAttachedOnError = Boolean((await chrome.debugger.getTargets()).find(x => x.tabId === tab.id)?.attached);\n    } catch (_) {}\n  }\n  try {\n    if (tab?.id) await chrome.tabs.update(tab.id, { url: ${JSON.stringify(server.reportUrl)} + '?data=' + encodeURIComponent(JSON.stringify(out)) });\n    else await chrome.tabs.create({ url: ${JSON.stringify(server.reportUrl)} + '?data=' + encodeURIComponent(JSON.stringify(out)), active: false });\n  } catch (_) {}\n})();\n`;
  fs.appendFileSync(path.join(extension, 'service-worker.js'), sidecar);
  return { root, extension };
}

async function runBrowser(server) {
  const temp = makeTempExtension(server);
  let browser = null;
  let browserProcess = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      pipe: false,
      enableExtensions: [temp.extension],
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']
    });
    browserProcess = browser.process();
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && target.url().endsWith('/service-worker.js'),
      { timeout: 30000 }
    );
    const extensionId = new URL(workerTarget.url()).host;
    const browserVersion = await browser.version();

    // Disconnect before the sidecar creates the fixture tab, so Puppeteer cannot
    // contaminate chrome.debugger.getTargets() for the product target.
    await browser.disconnect();
    browser = null;

    const result = await Promise.race([
      server.report,
      new Promise((_, reject) => setTimeout(() => reject(new Error('C46 report timeout')), 90000))
    ]);

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.guardInstalled, true);
    assert.equal(result.fixtureTitle, TITLE);
    assert.equal(result.renderStateListenerOk, true);
    assert.equal(result.renderStateListenerAfterOk, true);
    assert.equal(result.debuggerAttachedBefore, false);
    assert.equal(result.debuggerAttachedAfter, false);
    assert.equal(result.debuggerActiveSetAfter, false);
    assert.equal(result.debuggerLateAttachCleanupAfter, false);
    assert.equal(result.debuggerPendingDetachAfter, false);
    assert.equal(result.debuggerPendingActualSettlementCountAfter, 0);
    assert(Number(result.pdfBytes) > 1000);
    assert.match(String(result.pdfSha256 || ''), /^[0-9a-f]{64}$/);
    assert(String(result.pdfHeaderHex || '').startsWith('255044462d'));

    return { browserVersion, extensionId, ...result };
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (browserProcess && browserProcess.exitCode == null) {
      try { browserProcess.kill('SIGTERM'); } catch (_) {}
    }
    fs.rmSync(temp.root, { recursive: true, force: true });
  }
}

const source = sourceChecks();
const server = await startServer();
try {
  const realUnpacked = await runBrowser(server);
  const output = {
    sourceBaseline: BASELINE,
    sourceHashes: {
      manifest: sha256(fs.readFileSync(path.join(ROOT, 'manifest.json'))),
      content: sha256(fs.readFileSync(path.join(ROOT, 'content.js'))),
      guard: sha256(fs.readFileSync(path.join(ROOT, 'pdf-print-guard.js'))),
      worker: sha256(fs.readFileSync(path.join(ROOT, 'service-worker.js')))
    },
    source,
    realUnpacked,
    classification: 'C46 L4 candidate: production content-script render-state handshake plus production generatePdfBlob physical PDF and debugger cleanup; native permission/incognito/restart remain L5 open'
  };
  output.resultSha256 = sha256(JSON.stringify(output));
  console.log('C46_RESULT_JSON=' + JSON.stringify(output));
} finally {
  await new Promise(resolve => server.server.close(resolve));
}
