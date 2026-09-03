#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
const GUARD = fs.readFileSync(path.join(ROOT, 'pdf-print-guard.js'), 'utf8');
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const TITLE = 'C46 browser detach fixture';

function sourceChecks() {
  assert((MANIFEST.permissions || []).includes('debugger'));
  assert(GUARD.includes('WEBCLIP_PRINT_RENDER_STATE'));
  assert(CONTENT.includes("message?.type === 'WEBCLIP_PRINT_RENDER_STATE'"));
  assert(WORKER.includes('async function generatePdfBlob(tabId)'));
  return { manifestVersion: MANIFEST.version };
}

async function serverStart() {
  let resolveReport;
  const report = new Promise(resolve => { resolveReport = resolve; });
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/fixture') {
      const body = `<!doctype html><meta charset="utf-8"><title>${TITLE}</title><h1>C46_BROWSER_DETACH</h1><p>production receiver fixture</p>`;
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(body)}); res.end(body); return;
    }
    if (u.pathname === '/report') {
      try { resolveReport(JSON.parse(u.searchParams.get('data') || '{}')); res.writeHead(200); res.end('ok'); }
      catch { res.writeHead(400); res.end('bad'); }
      return;
    }
    res.writeHead(404); res.end('not found');
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const {port}=server.address();
  return {server,report,fixture:`http://127.0.0.1:${port}/fixture`,reportUrl:`http://127.0.0.1:${port}/report`};
}

function makeExtension(s) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'c46-browser-detach-'));
  const ext=path.join(root,'extension');
  fs.cpSync(ROOT,ext,{recursive:true,filter(src){const rel=path.relative(ROOT,src);if(!rel)return true;return !['.git','node_modules'].includes(rel.split(path.sep)[0])}});
  const mp=path.join(ext,'manifest.json');
  const m=JSON.parse(fs.readFileSync(mp,'utf8'));
  m.host_permissions=[...new Set([...(m.host_permissions||[]),'http://127.0.0.1/*'])];
  m.content_scripts=[...(m.content_scripts||[]),{matches:['http://127.0.0.1/*'],js:['content.js'],run_at:'document_start'}];
  fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');
  const sidecar=`\n(async()=>{\nconst out={ok:false,detachEvents:[]};const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async id=>{for(let i=0;i<120;i++){const t=await chrome.tabs.get(id);if(t.status==='complete')return;await sleep(100)}throw new Error('load timeout')};const attached=async id=>Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===id)?.attached);let first=null,second=null;const onDetach=(source,reason)=>out.detachEvents.push({tabId:source?.tabId||0,reason:String(reason||'')});chrome.debugger.onDetach.addListener(onDetach);try{await sleep(2500);first=await chrome.tabs.create({url:${JSON.stringify(s.fixture)},active:false});out.firstTabId=first.id;await wait(first.id);await sleep(250);out.firstListener=(await chrome.tabs.sendMessage(first.id,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false}))?.ok===true;out.firstAttachedBefore=await attached(first.id);await chrome.debugger.attach({tabId:first.id},'1.3');out.firstAttachedAfterAttach=await attached(first.id);await chrome.debugger.sendCommand({tabId:first.id},'Page.enable');await chrome.debugger.sendCommand({tabId:first.id},'Runtime.enable');out.firstRuntimeBeforeClose=(await chrome.debugger.sendCommand({tabId:first.id},'Runtime.evaluate',{expression:'21*2',returnByValue:true}))?.result?.value;await chrome.tabs.remove(first.id);await sleep(600);out.detachEventsAfterClose=[...out.detachEvents];out.firstTargetPresentAfterClose=Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===first.id));second=await chrome.tabs.create({url:${JSON.stringify(s.fixture)},active:false});await wait(second.id);await sleep(250);out.secondListener=(await chrome.tabs.sendMessage(second.id,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false}))?.ok===true;out.secondAttachedBefore=await attached(second.id);const blob=await generatePdfBlob(second.id);const bytes=new Uint8Array(await blob.arrayBuffer());out.secondPdfBytes=bytes.length;out.secondPdfHeader=[...bytes.subarray(0,5)].map(x=>String.fromCharCode(x)).join('');out.secondAttachedAfter=await attached(second.id);out.activeAfter=debuggerActiveTabs.has(second.id);out.lateAfter=debuggerLateAttachCleanupByTab.has(second.id);out.pendingDetachAfter=debuggerPendingDetachByTab.has(second.id);out.pendingActualAfter=debuggerPendingActualSettlements.size;out.ok=true}catch(e){out.error=String(e?.stack||e)}finally{chrome.debugger.onDetach.removeListener(onDetach);try{if(second?.id)await chrome.tabs.update(second.id,{url:${JSON.stringify(s.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out))});else await chrome.tabs.create({url:${JSON.stringify(s.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out)),active:false})}catch(_){}}})();\n`;
  fs.appendFileSync(path.join(ext,'service-worker.js'),sidecar);
  return {root,ext};
}

const source=sourceChecks();
const s=await serverStart();
const temp=makeExtension(s);let browser=null,proc=null;
try{
  browser=await puppeteer.launch({headless:false,pipe:false,enableExtensions:[temp.ext],args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check']});
  proc=browser.process();
  const target=await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().endsWith('/service-worker.js'),{timeout:30000});
  const browserVersion=await browser.version();const extensionId=new URL(target.url()).host;
  await browser.disconnect();browser=null;
  const result=await Promise.race([s.report,new Promise((_,reject)=>setTimeout(()=>reject(new Error('C46 browser detach report timeout')),90000))]);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.firstListener,true);assert.equal(result.firstAttachedBefore,false);assert.equal(result.firstAttachedAfterAttach,true);assert.equal(result.firstRuntimeBeforeClose,42);
  assert.equal(result.firstTargetPresentAfterClose,false);
  assert(result.detachEventsAfterClose.some(e=>e.tabId===result.firstTabId),JSON.stringify(result.detachEventsAfterClose));
  assert.equal(result.secondListener,true);assert.equal(result.secondAttachedBefore,false);assert(Number(result.secondPdfBytes)>1000);assert(String(result.secondPdfHeader).startsWith('%PDF-'));assert.equal(result.secondAttachedAfter,false);
  assert.equal(result.activeAfter,false);assert.equal(result.lateAfter,false);assert.equal(result.pendingDetachAfter,false);assert.equal(result.pendingActualAfter,0);
  console.log('C46_BROWSER_DETACH_JSON='+JSON.stringify({source,browserVersion,extensionId,result}));
}finally{if(browser)await browser.close().catch(()=>{});if(proc&&proc.exitCode==null){try{proc.kill('SIGTERM')}catch{}}await new Promise(r=>s.server.close(r));fs.rmSync(temp.root,{recursive:true,force:true});}
