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

function sourceChecks() {
  const p = new Set(MANIFEST.permissions || []);
  const h = new Set(MANIFEST.optional_host_permissions || []);
  const grant = POPUP.slice(POPUP.indexOf("grantFrameAccessButton?.addEventListener('click'"), POPUP.indexOf("readLaterButton.addEventListener"));
  const checks = {
    manifestDebuggerRequired: p.has('debugger'),
    optionalHttp: h.has('http://*/*'),
    optionalHttps: h.has('https://*/*'),
    incognitoManifestKey: Object.hasOwn(MANIFEST, 'incognito'),
    backupLoadedBeforeActiveTabClassifier: POPUP.indexOf('loadBackupStatus();') < POPUP.indexOf('async function getActiveSourceTab'),
    permissionRequestAfterDiscovery: grant.indexOf('await collectCrossOriginFrameOrigins') >= 0 && grant.indexOf('await collectCrossOriginFrameOrigins') < grant.indexOf('chrome.permissions.request'),
    popupTimeout10s: /POPUP_EXTENSION_API_TIMEOUT_MS\s*=\s*10_000/.test(POPUP),
    contentIncognitoGuard: WORKER.includes('sender?.tab?.incognito'),
    permissionsOnRemoved: WORKER.includes('chrome.permissions.onRemoved'),
    framePermissionRecheck: WORKER.includes('frameAgentHasGrantedHostPermission'),
    frameRegistryMemoryOnly: WORKER.includes('frameAgentsByTab = new Map()'),
    reinjectReregistersExistingAgent: FRAME_AGENT.includes('__WEBCLIP_FRAME_AGENT_LOADED__') && FRAME_AGENT.includes('WEBCLIP_FRAME_AGENT_REGISTER'),
    debuggerBoundedAttach: WORKER.includes('async function attachDebuggerBounded'),
    debuggerBoundedDetach: WORKER.includes('async function detachDebuggerBounded'),
    debuggerPrintToPdf: WORKER.includes("chrome.debugger.sendCommand(debuggee, 'Page.printToPDF'"),
    debuggerCleanupRegistries: ['debuggerActiveTabs = new Set()','debuggerLateAttachCleanupByTab = new Map()','debuggerPendingDetachByTab = new Map()','debuggerPendingActualSettlements = new Set()','debuggerActiveTabs.delete(tabId)'].every(x=>WORKER.includes(x)),
    debuggerOnDetach: WORKER.includes('debugger.onDetach'),
  };
  for (const k of ['manifestDebuggerRequired','optionalHttp','optionalHttps','backupLoadedBeforeActiveTabClassifier','permissionRequestAfterDiscovery','popupTimeout10s','contentIncognitoGuard','framePermissionRecheck','frameRegistryMemoryOnly','reinjectReregistersExistingAgent','debuggerBoundedAttach','debuggerBoundedDetach','debuggerPrintToPdf','debuggerCleanupRegistries']) assert.equal(checks[k], true, k);
  assert.equal(checks.incognitoManifestKey, false);
  assert.equal(checks.permissionsOnRemoved, false);
  assert.equal(checks.debuggerOnDetach, false);
  return checks;
}

async function fixtureServer() {
  let resolveReport, rejectReport;
  const report = new Promise((r,j)=>{resolveReport=r;rejectReport=j;});
  const server = http.createServer((req,res)=>{
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/fixture') {
      const body = `<!doctype html><meta charset="utf-8"><title>${FIXTURE_TITLE}</title><main><h1>C46_REAL_UNPACKED_DEBUGGER_MARKER_4A7F</h1><p>production debugger path</p></main>`;
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); res.end(body); return;
    }
    if (u.pathname === '/report') {
      try { resolveReport(JSON.parse(u.searchParams.get('data') || '{}')); res.writeHead(200); res.end('ok'); }
      catch(e) { rejectReport(e); res.writeHead(400); res.end('bad'); }
      return;
    }
    res.writeHead(404); res.end('no');
  });
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
  const {port} = server.address();
  return {server, report, fixtureUrl:`http://127.0.0.1:${port}/fixture`, reportUrl:`http://127.0.0.1:${port}/report`, originPattern:`http://127.0.0.1:${port}/*`};
}

function makeTempExt(f) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(),'webclip-c46-'));
  const ext = path.join(tempRoot,'extension');
  fs.cpSync(ROOT, ext, {recursive:true, filter(src){ const rel=path.relative(ROOT,src); if(!rel)return true; return !['.git','node_modules'].includes(rel.split(path.sep)[0]); }});
  const worker = path.join(ext,'service-worker.js');
  fs.appendFileSync(worker, `\n// C46 test-only listener in temporary copy only.\nchrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{\n if(msg?.type!=='C46_RUN_REAL_DEBUGGER') return false;\n (async()=>{\n  const out={ok:false,stage:'start'}; let tab=null;\n  try {\n   out.incognitoAllowed=await chrome.extension.isAllowedIncognitoAccess();\n   out.optionalOriginGrantedInitially=await chrome.permissions.contains({origins:[${JSON.stringify(f.originPattern)}]});\n   out.stage='tab-create'; tab=await chrome.tabs.create({url:${JSON.stringify(f.fixtureUrl)},active:false}); out.tabId=tab.id;\n   out.stage='tab-load';\n   if((await chrome.tabs.get(tab.id)).status!=='complete') await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(fn);reject(new Error('load-timeout'));},15000);const fn=(id,info)=>{if(id===tab.id&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(fn);resolve();}};chrome.tabs.onUpdated.addListener(fn);});\n   out.fixtureTitle=(await chrome.tabs.get(tab.id)).title||'';\n   out.stage='before'; out.debuggerAttachedBefore=Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===tab.id)?.attached);\n   out.stage='generate'; const blob=await generatePdfBlob(tab.id); const bytes=new Uint8Array(await blob.arrayBuffer());\n   out.stage='digest'; const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)); out.pdfBytes=bytes.length; out.pdfSha256=[...digest].map(x=>x.toString(16).padStart(2,'0')).join(''); out.pdfHeaderHex=[...bytes.subarray(0,8)].map(x=>x.toString(16).padStart(2,'0')).join('');\n   out.stage='after'; out.debuggerAttachedAfter=Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===tab.id)?.attached); out.debuggerActiveSetAfter=debuggerActiveTabs.has(tab.id); out.debuggerLateAttachCleanupAfter=debuggerLateAttachCleanupByTab.has(tab.id); out.debuggerPendingDetachAfter=debuggerPendingDetachByTab.has(tab.id); out.debuggerPendingActualSettlementCountAfter=debuggerPendingActualSettlements.size;\n   out.ok=true; out.stage='done';\n  } catch(e) { out.error=String(e?.stack||e?.message||e); }\n  try { if(tab?.id) await chrome.tabs.remove(tab.id); } catch(_){}\n  sendResponse(out);\n })(); return true;\n});\n`, 'utf8');
  fs.writeFileSync(path.join(ext,'c46-driver.html'), '<!doctype html><meta charset="utf-8"><script src="c46-driver.js"></script>', 'utf8');
  fs.writeFileSync(path.join(ext,'c46-driver.js'), `chrome.runtime.sendMessage({type:'C46_RUN_REAL_DEBUGGER'}).then(async out=>{const u=${JSON.stringify(f.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out));location.href=u;}).catch(async e=>{const out={ok:false,stage:'runtime-message',error:String(e?.stack||e)};location.href=${JSON.stringify(f.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out));});`, 'utf8');
  return {tempRoot, ext};
}

async function runBrowser(f) {
  const t = makeTempExt(f);
  let browser;
  try {
    browser = await puppeteer.launch({headless:false,pipe:true,enableExtensions:[t.ext],args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check']});
    const sw = await browser.waitForTarget(x=>x.type()==='service_worker'&&x.url().endsWith('/service-worker.js'),{timeout:30000});
    const extensionId = new URL(sw.url()).host;
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/c46-driver.html`);
    const result = await Promise.race([f.report,new Promise((_,j)=>setTimeout(()=>j(new Error('report-timeout')),30000))]);
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(result.optionalOriginGrantedInitially,false);
    assert.equal(result.debuggerAttachedBefore,false);
    assert.equal(result.debuggerAttachedAfter,false);
    assert.equal(result.debuggerActiveSetAfter,false);
    assert.equal(result.debuggerLateAttachCleanupAfter,false);
    assert.equal(result.debuggerPendingDetachAfter,false);
    assert.equal(result.debuggerPendingActualSettlementCountAfter,0);
    assert.equal(result.fixtureTitle,FIXTURE_TITLE);
    assert(Number(result.pdfBytes)>1000);
    assert.match(String(result.pdfSha256||''),/^[0-9a-f]{64}$/);
    assert(String(result.pdfHeaderHex||'').startsWith('255044462d'));
    return {browserVersion:await browser.version(),extensionId,...result};
  } finally { if(browser) await browser.close().catch(()=>{}); fs.rmSync(t.tempRoot,{recursive:true,force:true}); }
}

const source = sourceChecks();
const f = await fixtureServer();
try {
  const realUnpacked = await runBrowser(f);
  const result={sourceBaseline:process.env.C46_SOURCE_BASELINE||'',source,realUnpacked,classification:'L4 real-unpacked production chrome.debugger/Page.printToPDF positive control plus exact-source privacy/permission/revoke findings; native prompt, incognito toggle, revoke/regrant and restart remain L5 open'};
  result.resultSha256=crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
  console.log('C46_RESULT_JSON='+JSON.stringify(result));
} finally { await new Promise(r=>f.server.close(r)); }
