#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
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
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/fixture')) {
      const body = `<!doctype html><meta charset="utf-8"><title>${FIXTURE_TITLE}</title><main><h1>${FIXTURE_MARKER}</h1><p>Production debugger path fixture.</p></main>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
      return;
    }
    res.writeHead(404); res.end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/fixture`;
  return { server, url, originPattern: `http://127.0.0.1:${address.port}/*` };
}

async function runRealUnpacked(fixtureUrl, originPattern) {
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    enableExtensions: [ROOT],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  });
  try {
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && target.url().endsWith('/service-worker.js'),
      { timeout: 30000 },
    );
    const worker = await workerTarget.worker();
    assert(worker, 'MV3 service worker context is available');
    const extensionId = new URL(workerTarget.url()).host;

    const result = await worker.evaluate(async ({ fixtureUrl, originPattern }) => {
      const out = { ok: false, stage: 'init' };
      let tab = null;
      const waitForLoaded = async (tabId) => {
        const current = await chrome.tabs.get(tabId);
        if (current.status === 'complete') return;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error('fixture-load-timeout'));
          }, 15000);
          const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
              clearTimeout(timer);
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
        });
      };

      try {
        out.stage = 'incognito-access';
        out.incognitoAllowed = await chrome.extension.isAllowedIncognitoAccess();
        out.stage = 'optional-permission-state';
        out.optionalOriginGrantedInitially = await chrome.permissions.contains({ origins: [originPattern] });
        out.stage = 'tab-create';
        tab = await chrome.tabs.create({ url: fixtureUrl, active: false });
        out.tabId = tab.id;
        out.stage = 'tab-load';
        await waitForLoaded(tab.id);
        out.fixtureTitle = (await chrome.tabs.get(tab.id)).title || '';
        out.stage = 'debugger-target-before';
        const before = (await chrome.debugger.getTargets()).find(x => x.tabId === tab.id);
        out.debuggerAttachedBefore = Boolean(before?.attached);

        out.stage = 'production-generate-pdf';
        const pdfBlob = await generatePdfBlob(tab.id);
        out.stage = 'pdf-digest';
        const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        out.pdfBase64 = btoa(binary);
        out.pdfBytes = bytes.byteLength;
        out.pdfSha256 = [...digest].map(x => x.toString(16).padStart(2, '0')).join('');

        out.stage = 'debugger-target-after';
        const after = (await chrome.debugger.getTargets()).find(x => x.tabId === tab.id);
        out.debuggerAttachedAfter = Boolean(after?.attached);
        out.debuggerActiveSetAfter = debuggerActiveTabs.has(tab.id);
        out.debuggerLateAttachCleanupAfter = debuggerLateAttachCleanupByTab.has(tab.id);
        out.debuggerPendingDetachAfter = debuggerPendingDetachByTab.has(tab.id);
        out.debuggerPendingActualSettlementCountAfter = debuggerPendingActualSettlements.size;
        out.stage = 'done';
        out.ok = true;
      } catch (error) {
        out.error = String(error?.stack || error?.message || error);
      } finally {
        if (tab?.id) {
          try { await chrome.tabs.remove(tab.id); } catch (_) {}
        }
      }
      return out;
    }, { fixtureUrl, originPattern });

    assert.equal(result.ok, true, `browser stage failed: ${JSON.stringify(result)}`);
    const pdf = Buffer.from(result.pdfBase64, 'base64');
    delete result.pdfBase64;
    assert(pdf.length > 1000, 'physical PDF bytes');
    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-', 'PDF signature');
    assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'), result.pdfSha256, 'Node and worker PDF digest agree');
    assert.equal(result.optionalOriginGrantedInitially, false, 'optional host is not silently granted');
    assert.equal(result.debuggerAttachedBefore, false, 'debugger starts detached');
    assert.equal(result.debuggerAttachedAfter, false, 'debugger finishes detached');
    assert.equal(result.debuggerActiveSetAfter, false, 'active registry cleaned');
    assert.equal(result.debuggerLateAttachCleanupAfter, false, 'late-attach registry cleaned');
    assert.equal(result.debuggerPendingDetachAfter, false, 'pending-detach registry cleaned');
    assert.equal(result.debuggerPendingActualSettlementCountAfter, 0, 'all debugger API promises settled');
    assert.equal(result.fixtureTitle, FIXTURE_TITLE, 'correct fixture tab was printed');

    return {
      browserVersion: await browser.version(),
      extensionId,
      ...result,
      pdfHeader: pdf.subarray(0, 8).toString('ascii'),
    };
  } finally {
    await browser.close();
  }
}

const source = sourceChecks();
const fixture = await startFixture();
try {
  const realUnpacked = await runRealUnpacked(fixture.url, fixture.originPattern);
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
