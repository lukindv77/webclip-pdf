#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const POPUP = fs.readFileSync(path.join(ROOT, 'popup.js'), 'utf8');
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const FRAME_AGENT = fs.readFileSync(path.join(ROOT, 'frame-agent.js'), 'utf8');

const FIXTURE_TITLE = 'C46 real unpacked debugger fixture';
const FIXTURE_MARKER = 'C46_REAL_UNPACKED_DEBUGGER_MARKER_4A7F';

function sourceChecks() {
  const permissions = new Set(MANIFEST.permissions || []);
  const optionalHosts = new Set(MANIFEST.optional_host_permissions || []);
  const backupCall = POPUP.indexOf('loadBackupStatus();');
  const activeTabDef = POPUP.indexOf('async function getActiveSourceTab');
  const grantStart = POPUP.indexOf("grantFrameAccessButton?.addEventListener('click'");
  const grantBlock = grantStart >= 0 ? POPUP.slice(grantStart, grantStart + 12000) : '';
  const discovery = grantBlock.indexOf('await collectCrossOriginFrameOrigins');
  const permissionRequest = grantBlock.indexOf('chrome.permissions.request');
  const timeoutMatch = POPUP.match(/POPUP_EXTENSION_API_TIMEOUT_MS\s*=\s*([0-9_]+)/);
  const timeoutMs = timeoutMatch ? Number(timeoutMatch[1].replaceAll('_', '')) : null;

  const checks = {
    manifestDebuggerRequired: permissions.has('debugger'),
    manifestOptionalHttpHost: optionalHosts.has('http://*/*'),
    manifestOptionalHttpsHost: optionalHosts.has('https://*/*'),
    manifestIncognitoKeyPresent: Object.hasOwn(MANIFEST, 'incognito'),
    popupBackupStatusBeforeActiveTabClassification: backupCall >= 0 && activeTabDef >= 0 && backupCall < activeTabDef,
    popupPermissionRequestAfterAsyncDiscovery: discovery >= 0 && permissionRequest >= 0 && discovery < permissionRequest,
    popupCallsChromePermissionsRequest: POPUP.includes('chrome.permissions.request'),
    popupExtensionApiTimeoutMs: timeoutMs,
    contentSenderIncognitoGuardPresent: WORKER.includes('sender?.tab?.incognito'),
    permissionsOnRemovedListenerPresent: WORKER.includes('chrome.permissions.onRemoved'),
    frameAgentPermissionRecheckPresent: WORKER.includes('frameAgentHasGrantedHostPermission'),
    frameAgentMemoryRegistryPresent: WORKER.includes('frameAgentsByTab = new Map()'),
    frameAgentReinjectReregistersWithoutReset:
      FRAME_AGENT.includes('__WEBCLIP_FRAME_AGENT_LOADED__') &&
      FRAME_AGENT.includes('WEBCLIP_FRAME_AGENT_REGISTER') &&
      FRAME_AGENT.indexOf('__WEBCLIP_FRAME_AGENT_LOADED__') < FRAME_AGENT.indexOf('const state ='),
    debuggerActiveRegistryPresent: WORKER.includes('debuggerActiveTabs = new Set()'),
    debuggerLateAttachCleanupPresent: WORKER.includes('debuggerLateAttachCleanupByTab = new Map()'),
    debuggerPendingDetachPresent: WORKER.includes('debuggerPendingDetachByTab = new Map()'),
    debuggerActualSettlementTrackingPresent: WORKER.includes('debuggerPendingActualSettlements = new Set()'),
    boundedDebuggerAttachPresent: WORKER.includes('async function attachDebuggerBounded'),
    boundedDebuggerDetachPresent: WORKER.includes('async function detachDebuggerBounded'),
    physicalDebuggerPdfPathPresent: WORKER.includes("chrome.debugger.sendCommand(debuggee, 'Page.printToPDF'"),
    debuggerFinallyDropsActiveTab: WORKER.includes('debuggerActiveTabs.delete(tabId)'),
    debuggerOnDetachHandlingPresent: WORKER.includes('debugger.onDetach'),
  };

  for (const key of [
    'manifestDebuggerRequired', 'manifestOptionalHttpHost', 'manifestOptionalHttpsHost',
    'popupBackupStatusBeforeActiveTabClassification', 'popupPermissionRequestAfterAsyncDiscovery',
    'popupCallsChromePermissionsRequest', 'contentSenderIncognitoGuardPresent',
    'frameAgentPermissionRecheckPresent', 'frameAgentMemoryRegistryPresent',
    'frameAgentReinjectReregistersWithoutReset', 'debuggerActiveRegistryPresent',
    'debuggerLateAttachCleanupPresent', 'debuggerPendingDetachPresent',
    'debuggerActualSettlementTrackingPresent', 'boundedDebuggerAttachPresent',
    'boundedDebuggerDetachPresent', 'physicalDebuggerPdfPathPresent', 'debuggerFinallyDropsActiveTab',
  ]) assert.equal(checks[key], true, `${key} source guard`);
  assert.equal(checks.manifestIncognitoKeyPresent, false);
  assert.equal(checks.permissionsOnRemovedListenerPresent, false);
  assert.equal(checks.debuggerOnDetachHandlingPresent, false);
  assert.equal(checks.popupExtensionApiTimeoutMs, 10000);
  return checks;
}

async function startFixture() {
  let reportResolve;
  let reportReject;
  const reportPromise = new Promise((resolve, reject) => {
    reportResolve = resolve;
    reportReject = reject;
  });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/fixture') {
      const body = `<!doctype html><meta charset="utf-8"><title>${FIXTURE_TITLE}</title><main><h1>${FIXTURE_MARKER}</h1><p>Production debugger path fixture.</p></main>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
      return;
    }
    if (url.pathname === '/report') {
      try {
        reportResolve(JSON.parse(url.searchParams.get('data') || '{}'));
        res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
        res.end('ok');
      } catch (error) {
        reportReject(error);
        res.writeHead(400); res.end('bad report');
      }
      return;
    }
    res.writeHead(404); res.end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  return {
    server,
    fixtureUrl: `${base}/fixture`,
    reportUrl: `${base}/report`,
    originPattern: `${base}/*`,
    reportPromise,
  };
}

function testDriver({ fixtureUrl, reportUrl, originPattern }) {
  return `\n\n// C46 test-only sidecar appended only to a temporary unpacked copy.\n(async () => {\n  const out = { ok: false, stage: 'startup' };\n  let tab = null;\n  const report = async () => {\n    const data = encodeURIComponent(JSON.stringify(out));\n    try {\n      if (tab?.id) await chrome.tabs.update(tab.id, { url: ${JSON.stringify(reportUrl)} + '?data=' + data });\n      else await chrome.tabs.create({ url: ${JSON.stringify(reportUrl)} + '?data=' + data, active: false });\n    } catch (_) {}\n  };\n  const waitForLoaded = async (tabId) => {\n    const current = await chrome.tabs.get(tabId);\n    if (current.status === 'complete') return;\n    await new Promise((resolve, reject) => {\n      const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error('fixture-load-timeout')); }, 15000);\n      const listener = (updatedTabId, changeInfo) => {\n        if (updatedTabId === tabId && changeInfo.status === 'complete') {\n          clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve();\n        }\n      };\n      chrome.tabs.onUpdated.addListener(listener);\n    });\n  };\n  try {\n    await new Promise(resolve => setTimeout(resolve, 1500));\n    out.stage = 'incognito-access';\n    out.incognitoAllowed = await chrome.extension.isAllowedIncognitoAccess();\n    out.stage = 'optional-permission-state';\n    out.optionalOriginGrantedInitially = await chrome.permissions.contains({ origins: [${JSON.stringify(originPattern)}] });\n    out.stage = 'tab-create';\n    tab = await chrome.tabs.create({ url: ${JSON.stringify(fixtureUrl)}, active: false });\n    out.tabId = tab.id;\n    out.stage = 'tab-load';\n    await waitForLoaded(tab.id);\n    out.fixtureTitle = (await chrome.tabs.get(tab.id)).title || '';\n    out.stage = 'debugger-target-before';\n    const before = (await chrome.debugger.getTargets()).find(x => x.tabId === tab.id);\n    out.debuggerAttachedBefore = Boolean(before?.attached);\n    out.stage = 'production-generate-pdf';\n    const pdfBlob = await generatePdfBlob(tab.id);\n    out.stage = 'pdf-digest';\n    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());\n    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));\n    out.pdfBytes = bytes.byteLength;\n    out.pdfSha256 = [...digest].map(x => x.toString(16).padStart(2, '0')).join('');\n    out.pdfHeaderHex = [...bytes.subarray(0, 8)].map(x => x.toString(16).padStart(2, '0')).join('');\n    out.stage = 'debugger-target-after';\n    const after = (await chrome.debugger.getTargets()).find(x => x.tabId === tab.id);\n    out.debuggerAttachedAfter = Boolean(after?.attached);\n    out.debuggerActiveSetAfter = debuggerActiveTabs.has(tab.id);\n    out.debuggerLateAttachCleanupAfter = debuggerLateAttachCleanupByTab.has(tab.id);\n    out.debuggerPendingDetachAfter = debuggerPendingDetachByTab.has(tab.id);\n    out.debuggerPendingActualSettlementCountAfter = debuggerPendingActualSettlements.size;\n    out.stage = 'done';\n    out.ok = true;\n  } catch (error) {\n    out.error = String(error?.stack || error?.message || error);\n  }\n  await report();\n})();\n`;
}

function makeTemporaryExtension(fixture) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-c46-'));
  const extensionRoot = path.join(tempRoot, 'extension');
  fs.cpSync(ROOT, extensionRoot, {
    recursive: true,
    filter(source) {
      const rel = path.relative(ROOT, source);
      if (!rel) return true;
      const first = rel.split(path.sep)[0];
      return !['.git', 'node_modules'].includes(first);
    },
  });
  const workerPath = path.join(extensionRoot, 'service-worker.js');
  fs.appendFileSync(workerPath, testDriver(fixture), 'utf8');
  return { tempRoot, extensionRoot };
}

async function runRealUnpacked(fixture) {
  const temporary = makeTemporaryExtension(fixture);
  let browser = null;
  let browserProcess = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      pipe: true,
      enableExtensions: [temporary.extensionRoot],
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
    });
    browserProcess = browser.process();
    const browserVersion = await browser.version();
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && target.url().endsWith('/service-worker.js'),
      { timeout: 30000 },
    );
    const extensionId = new URL(workerTarget.url()).host;

    browser.disconnect();
    browser = null;

    const result = await Promise.race([
      fixture.reportPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('C46 report timeout after Puppeteer disconnect')), 30000)),
    ]);

    assert.equal(result.ok, true, `browser stage failed: ${JSON.stringify(result)}`);
    assert.equal(result.optionalOriginGrantedInitially, false, 'optional host is not silently granted');
    assert.equal(result.debuggerAttachedBefore, false, 'debugger starts detached after Puppeteer disconnect');
    assert.equal(result.debuggerAttachedAfter, false, 'debugger finishes detached');
    assert.equal(result.debuggerActiveSetAfter, false, 'active registry cleaned');
    assert.equal(result.debuggerLateAttachCleanupAfter, false, 'late-attach registry cleaned');
    assert.equal(result.debuggerPendingDetachAfter, false, 'pending-detach registry cleaned');
    assert.equal(result.debuggerPendingActualSettlementCountAfter, 0, 'all debugger API promises settled');
    assert.equal(result.fixtureTitle, FIXTURE_TITLE, 'correct fixture tab was printed');
    assert(Number(result.pdfBytes) > 1000, 'physical PDF bytes');
    assert.match(String(result.pdfSha256 || ''), /^[0-9a-f]{64}$/);
    assert(String(result.pdfHeaderHex || '').startsWith('255044462d'), 'physical PDF starts with %PDF-');

    return { browserVersion, extensionId, ...result };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    if (browserProcess && browserProcess.exitCode == null) {
      try { browserProcess.kill('SIGTERM'); } catch (_) {}
    }
    fs.rmSync(temporary.tempRoot, { recursive: true, force: true });
  }
}

const source = sourceChecks();
const fixture = await startFixture();
try {
  const realUnpacked = await runRealUnpacked(fixture);
  const result = {
    sourceBaseline: process.env.C46_SOURCE_BASELINE || '',
    source,
    realUnpacked,
    classification: 'L4 real-unpacked positive production chrome.debugger/Page.printToPDF lifecycle plus exact-source private-context/permission/revoke findings; interactive incognito toggle, native permission prompt, revoke/regrant and worker/browser restart remain L5 open',
  };
  const canonical = JSON.stringify(result);
  result.resultSha256 = crypto.createHash('sha256').update(canonical).digest('hex');
  console.log(`C46_RESULT_JSON=${JSON.stringify(result)}`);
} finally {
  await new Promise(resolve => fixture.server.close(resolve));
}
