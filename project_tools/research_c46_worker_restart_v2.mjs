#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const GUARD = fs.readFileSync(path.join(ROOT, 'pdf-print-guard.js'), 'utf8');
const CONTENT = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
const MARKER_KEY = '__c46ForcedWorkerRestartProbeV2';

function sourceChecks() {
  assert((MANIFEST.permissions || []).includes('debugger'));
  assert(WORKER.includes('const debuggerActiveTabs = new Set()'));
  assert(WORKER.includes('const debuggerPendingActualSettlements = new Set()'));
  assert(WORKER.includes('async function generatePdfBlob(tabId)'));
  assert(WORKER.includes('chrome.tabs.onUpdated.addListener'));
  assert(GUARD.includes("method !== 'Page.printToPDF'"));
  assert(CONTENT.includes("message?.type === 'WEBCLIP_PRINT_RENDER_STATE'"));
  return { manifestVersion: MANIFEST.version };
}

function heavyDocument() {
  const blocks = [];
  for (let i = 1; i <= 500; i += 1) {
    blocks.push(`<section class="page"><h2>C46_WORKER_RESTART_V2_${i}</h2><p>${'forced service worker restart during guarded production print '.repeat(16)}</p></section>`);
  }
  return `<!doctype html><meta charset="utf-8"><title>C46 worker restart v2 heavy fixture</title><style>html,body{margin:0}body{font:16px sans-serif}.page{box-sizing:border-box;min-height:980px;padding:42px;break-after:page}</style>${blocks.join('')}`;
}

async function startServer() {
  let startAllowed = false;
  let startAllowedAt = 0;
  let resolveArmed;
  let resolveReport;
  const armed = new Promise(resolve => { resolveArmed = resolve; });
  const report = new Promise(resolve => { resolveReport = resolve; });
  const heavy = heavyDocument();
  const recovery = '<!doctype html><meta charset="utf-8"><title>C46 worker restart v2 recovery fixture</title><h1>C46_WORKER_RESTART_RECOVERY</h1><p>unchanged production generation after forced worker restart</p>';
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/gate') {
      res.writeHead(startAllowed ? 200 : 425, {'content-type':'application/json'});
      res.end(JSON.stringify({allowed:startAllowed, allowedAt:startAllowedAt}));
      return;
    }
    if (u.pathname === '/heavy') {
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(heavy)});
      res.end(heavy);
      return;
    }
    if (u.pathname === '/recovery' || u.pathname === '/wake') {
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(recovery)});
      res.end(recovery);
      return;
    }
    if (u.pathname === '/armed') {
      try { resolveArmed(JSON.parse(u.searchParams.get('data') || '{}')); res.writeHead(200); res.end('ok'); }
      catch { res.writeHead(400); res.end('bad'); }
      return;
    }
    if (u.pathname === '/report') {
      try { resolveReport(JSON.parse(u.searchParams.get('data') || '{}')); res.writeHead(200); res.end('ok'); }
      catch { res.writeHead(400); res.end('bad'); }
      return;
    }
    res.writeHead(404); res.end('not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address();
  return {
    server, armed, report,
    allowStart() { startAllowed = true; startAllowedAt = Date.now(); return startAllowedAt; },
    gate: `http://127.0.0.1:${port}/gate`,
    heavy: `http://127.0.0.1:${port}/heavy`,
    recovery: `http://127.0.0.1:${port}/recovery`,
    wake: `http://127.0.0.1:${port}/wake`,
    armedUrl: `http://127.0.0.1:${port}/armed`,
    reportUrl: `http://127.0.0.1:${port}/report`
  };
}

function makeExtension(s) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c46-worker-restart-v2-'));
  const ext = path.join(root, 'extension');
  fs.cpSync(ROOT, ext, {
    recursive: true,
    filter(src) {
      const rel = path.relative(ROOT, src);
      if (!rel) return true;
      return !['.git', 'node_modules'].includes(rel.split(path.sep)[0]);
    }
  });
  const manifestPath = path.join(ext, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), 'http://127.0.0.1/*'])];
  manifest.content_scripts = [...(manifest.content_scripts || []), {
    matches: ['http://127.0.0.1/*'], js: ['content.js'], run_at: 'document_start'
  }];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const sidecar = `\n(async()=>{\nconst KEY=${JSON.stringify(MARKER_KEY)};\nconst workerStamp=crypto.randomUUID();\nconst sleep=ms=>new Promise(r=>setTimeout(r,ms));\nconst wait=async id=>{for(let i=0;i<180;i++){try{const t=await chrome.tabs.get(id);if(t.status==='complete')return}catch{}await sleep(100)}throw new Error('tab load timeout')};\nconst attached=async id=>Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===id)?.attached);\nconst send=(url,data)=>fetch(url+'?data='+encodeURIComponent(JSON.stringify(data))).catch(()=>{});\nconst waitGate=async()=>{for(let i=0;i<900;i++){try{const r=await fetch(${JSON.stringify(s.gate)},{cache:'no-store'});if(r.ok)return await r.json()}catch{}await sleep(100)}throw new Error('start gate timeout')};\nconst stored=await chrome.storage.local.get(KEY);\nconst marker=stored?.[KEY]||null;\nif(!marker){\n  const gate=await waitGate();\n  const firstCreateAt=Date.now();\n  const first=await chrome.tabs.create({url:${JSON.stringify(s.heavy)},active:false});\n  await wait(first.id);\n  await sleep(300);\n  const listener=(await chrome.tabs.sendMessage(first.id,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false}))?.ok===true;\n  const firstAttachedBefore=await attached(first.id);\n  await chrome.storage.local.set({[KEY]:{phase:'first-running',firstTabId:first.id,firstWorkerStamp:workerStamp,gateAllowedAt:gate.allowedAt,firstCreateAt,createdAt:Date.now()}});\n  const nativeSend=chrome.tabs.sendMessage;\n  let armed=false;\n  chrome.tabs.sendMessage=async function(tabId,message,...rest){\n    const response=await nativeSend.call(chrome.tabs,tabId,message,...rest);\n    if(!armed&&Number(tabId)===Number(first.id)&&message?.type==='WEBCLIP_PRINT_RENDER_STATE'&&message?.hidden===true&&response?.ok===true){\n      armed=true;\n      const isAttached=await attached(first.id);\n      const payload={phase:'kill-ready',firstTabId:first.id,firstWorkerStamp:workerStamp,listener,firstAttachedBefore,isAttached,gateAllowedAt:gate.allowedAt,firstCreateAt,at:Date.now()};\n      await chrome.storage.local.set({[KEY]:payload});\n      await send(${JSON.stringify(s.armedUrl)},payload);\n    }\n    return response;\n  };\n  void generatePdfBlob(first.id).then(async blob=>{\n    const bytes=new Uint8Array(await blob.arrayBuffer());\n    await chrome.storage.local.set({[KEY]:{phase:'unexpected-first-settlement',firstTabId:first.id,firstWorkerStamp:workerStamp,bytes:bytes.length,at:Date.now()}});\n  },async error=>{\n    await chrome.storage.local.set({[KEY]:{phase:'unexpected-first-rejection',firstTabId:first.id,firstWorkerStamp:workerStamp,error:String(error?.message||error),at:Date.now()}});\n  });\n  return;\n}\nif(marker.phase==='kill-ready'){\n  const out={ok:false,restarted:true,marker,secondWorkerStamp:workerStamp,restartAt:Date.now()};\n  try{\n    out.workerStampChanged=workerStamp!==marker.firstWorkerStamp;\n    const initialTargets=await chrome.debugger.getTargets();\n    const firstTarget=initialTargets.find(x=>x.tabId===marker.firstTabId)||null;\n    out.oldTargetPresent=Boolean(firstTarget);\n    out.oldAttachedAfterRestart=Boolean(firstTarget?.attached);\n    out.initialActiveSize=debuggerActiveTabs.size;\n    out.initialLateSize=debuggerLateAttachCleanupByTab.size;\n    out.initialPendingDetachSize=debuggerPendingDetachByTab.size;\n    out.initialPendingActualSize=debuggerPendingActualSettlements.size;\n    if(out.oldAttachedAfterRestart){\n      try{const evalResult=await chrome.debugger.sendCommand({tabId:marker.firstTabId},'Runtime.evaluate',{expression:'6*7',returnByValue:true});out.oldSessionCommandResult=evalResult?.result?.value??null}\n      catch(e){out.oldSessionCommandError=String(e?.message||e)}\n    }\n    const second=await chrome.tabs.create({url:${JSON.stringify(s.recovery)},active:false});\n    out.secondTabId=second.id;\n    await wait(second.id);\n    await sleep(250);\n    out.secondListener=(await chrome.tabs.sendMessage(second.id,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false}))?.ok===true;\n    out.secondAttachedBefore=await attached(second.id);\n    const generation=Promise.resolve().then(()=>generatePdfBlob(second.id));\n    out.secondOutcome=await Promise.race([\n      generation.then(async blob=>{const bytes=new Uint8Array(await blob.arrayBuffer());return {kind:'resolved',bytes:bytes.length,header:[...bytes.subarray(0,5)].map(x=>String.fromCharCode(x)).join(''),at:Date.now()}},e=>({kind:'rejected',error:String(e?.message||e),at:Date.now()})),\n      sleep(30000).then(()=>({kind:'timeout',at:Date.now()}))\n    ]);\n    out.firstAttachedAfterSecond=await attached(marker.firstTabId).catch(()=>false);\n    out.secondAttachedAfter=await attached(second.id).catch(()=>false);\n    out.finalActiveSize=debuggerActiveTabs.size;\n    out.finalLateSize=debuggerLateAttachCleanupByTab.size;\n    out.finalPendingDetachSize=debuggerPendingDetachByTab.size;\n    out.finalPendingActualSize=debuggerPendingActualSettlements.size;\n    if(out.firstAttachedAfterSecond){try{await chrome.debugger.detach({tabId:marker.firstTabId});out.oldCleanupDetach=true}catch(e){out.oldCleanupDetachError=String(e?.message||e)}}\n    try{await chrome.tabs.sendMessage(marker.firstTabId,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false});out.oldRenderStateCleanup=true}catch(e){out.oldRenderStateCleanupError=String(e?.message||e)}\n    await chrome.storage.local.remove(KEY);\n    out.ok=true;\n  }catch(e){out.error=String(e?.stack||e);try{await chrome.storage.local.remove(KEY)}catch{}}\n  await send(${JSON.stringify(s.reportUrl)},out);\n  return;\n}\nawait send(${JSON.stringify(s.reportUrl)},{ok:false,restarted:true,secondWorkerStamp:workerStamp,unexpectedMarker:marker});\n})();\n`;
  fs.appendFileSync(path.join(ext, 'service-worker.js'), sidecar);
  return { root, ext };
}

async function rawBrowserCdp(wsUrl) {
  assert.equal(typeof WebSocket, 'function', 'Node global WebSocket unavailable');
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('browser CDP websocket open timeout')), 10000);
    ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener('error', (event) => { clearTimeout(timer); reject(new Error(`browser CDP websocket error: ${event?.message || 'unknown'}`)); }, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result || {});
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(new Error(`browser CDP ${method} timeout`));
    }, 10000);
  });
  return { ws, send, close: () => ws.close() };
}

const source = sourceChecks();
const s = await startServer();
const temp = makeExtension(s);
let browser = null;
let proc = null;
let cdp = null;
try {
  browser = await puppeteer.launch({
    headless: false, pipe: false, enableExtensions: [temp.ext],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']
  });
  proc = browser.process();
  const serviceWorkerTarget = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'), { timeout: 30000 });
  const browserVersion = await browser.version();
  const extensionId = new URL(serviceWorkerTarget.url()).host;
  const wsEndpoint = browser.wsEndpoint();
  const disconnectedAt = Date.now();
  await browser.disconnect();
  browser = null;
  const gateAllowedAt = s.allowStart();
  assert(gateAllowedAt >= disconnectedAt);

  const armed = await Promise.race([s.armed, new Promise((_, reject) => setTimeout(() => reject(new Error('worker kill-ready timeout')), 90000))]);
  assert.equal(armed.phase, 'kill-ready', JSON.stringify(armed));
  assert.equal(armed.firstAttachedBefore, false, JSON.stringify(armed));
  assert.equal(armed.isAttached, true, JSON.stringify(armed));
  assert(Number(armed.firstCreateAt) >= gateAllowedAt, JSON.stringify({disconnectedAt,gateAllowedAt,armed}));
  assert(Number(armed.gateAllowedAt) === gateAllowedAt, JSON.stringify({gateAllowedAt,armed}));

  cdp = await rawBrowserCdp(wsEndpoint);
  const beforeTargets = await cdp.send('Target.getTargets');
  const oldWorker = (beforeTargets.targetInfos || []).find(info => info.type === 'service_worker' && info.url === `chrome-extension://${extensionId}/service-worker.js`);
  assert(oldWorker?.targetId, JSON.stringify(beforeTargets.targetInfos || []));
  const closeResult = await cdp.send('Target.closeTarget', { targetId: oldWorker.targetId });
  assert.equal(closeResult.success, true, JSON.stringify(closeResult));
  const closedWorkerTargetId = oldWorker.targetId;

  await new Promise(resolve => setTimeout(resolve, 300));
  await cdp.send('Target.createTarget', { url: s.wake });

  let newWorkerTargetId = '';
  for (let i = 0; i < 100; i += 1) {
    const current = await cdp.send('Target.getTargets');
    const next = (current.targetInfos || []).find(info => info.type === 'service_worker' && info.url === `chrome-extension://${extensionId}/service-worker.js` && info.targetId !== closedWorkerTargetId);
    if (next?.targetId) { newWorkerTargetId = next.targetId; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const report = await Promise.race([s.report, new Promise((_, reject) => setTimeout(() => reject(new Error('worker restart report timeout')), 90000))]);
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.restarted, true, JSON.stringify(report));
  assert.equal(report.workerStampChanged, true, JSON.stringify(report));
  assert(newWorkerTargetId, 'new service worker target was not observed');
  assert.equal(report.oldTargetPresent, true, JSON.stringify(report));
  assert.equal(report.oldAttachedAfterRestart, true, JSON.stringify(report));
  assert.equal(report.initialActiveSize, 0, JSON.stringify(report));
  assert.equal(report.initialLateSize, 0, JSON.stringify(report));
  assert.equal(report.initialPendingDetachSize, 0, JSON.stringify(report));
  assert.equal(report.initialPendingActualSize, 0, JSON.stringify(report));
  assert.equal(report.oldSessionCommandResult, 42, JSON.stringify(report));
  assert.equal(report.secondListener, true, JSON.stringify(report));
  assert.equal(report.secondAttachedBefore, false, JSON.stringify(report));
  assert.equal(report.secondOutcome?.kind, 'resolved', JSON.stringify(report.secondOutcome));
  assert(Number(report.secondOutcome?.bytes) > 1000, JSON.stringify(report.secondOutcome));
  assert(String(report.secondOutcome?.header).startsWith('%PDF-'), JSON.stringify(report.secondOutcome));
  assert.equal(report.firstAttachedAfterSecond, true, JSON.stringify(report));
  assert.equal(report.secondAttachedAfter, false, JSON.stringify(report));
  assert.equal(report.finalActiveSize, 0, JSON.stringify(report));
  assert.equal(report.finalLateSize, 0, JSON.stringify(report));
  assert.equal(report.finalPendingDetachSize, 0, JSON.stringify(report));
  assert.equal(report.finalPendingActualSize, 0, JSON.stringify(report));

  console.log('C46_WORKER_RESTART_V2_JSON=' + JSON.stringify({
    source, browserVersion, extensionId, disconnectedAt, gateAllowedAt,
    closedWorkerTargetId, newWorkerTargetId, closeResult, armed,
    verdict:'STALE_DEBUGGER_SESSION_SURVIVED_WORKER_RESTART_WITH_LOST_LOCAL_REGISTRY',
    report
  }));
} finally {
  try { cdp?.close(); } catch {}
  if (browser) await browser.close().catch(() => {});
  if (proc && proc.exitCode == null) { try { proc.kill('SIGTERM'); } catch {} }
  await new Promise(resolve => s.server.close(resolve));
  fs.rmSync(temp.root, { recursive: true, force: true });
}
