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
const HEAVY_TITLE = 'C46 in-flight detach heavy fixture';
const RECOVERY_TITLE = 'C46 in-flight detach recovery fixture';

function sourceChecks() {
  assert((MANIFEST.permissions || []).includes('debugger'));
  assert(GUARD.includes('WEBCLIP_PRINT_RENDER_STATE'));
  assert(GUARD.includes("method !== 'Page.printToPDF'"));
  assert(CONTENT.includes("message?.type === 'WEBCLIP_PRINT_RENDER_STATE'"));
  assert(WORKER.includes('async function generatePdfBlob(tabId)'));
  assert(WORKER.includes('const debuggerActiveTabs = new Set()'));
  assert(WORKER.includes('const debuggerPendingActualSettlements = new Set()'));
  return { manifestVersion: MANIFEST.version };
}

function heavyDocument() {
  const pages = [];
  for (let i = 1; i <= 400; i += 1) {
    pages.push(`<section class="page"><h2>C46_INFLIGHT_PAGE_${i}</h2><p>${'bounded production print interruption '.repeat(18)}</p></section>`);
  }
  return `<!doctype html><meta charset="utf-8"><title>${HEAVY_TITLE}</title><style>html,body{margin:0}body{font:16px sans-serif}.page{box-sizing:border-box;min-height:980px;padding:40px;break-after:page}.page:nth-child(3n){font-size:17px}</style>${pages.join('')}`;
}

async function serverStart() {
  let resolveReport;
  const report = new Promise(resolve => { resolveReport = resolve; });
  const heavy = heavyDocument();
  const recovery = `<!doctype html><meta charset="utf-8"><title>${RECOVERY_TITLE}</title><h1>C46_RECOVERY</h1><p>subsequent unchanged production generation</p>`;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/heavy') {
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(heavy)});
      res.end(heavy);
      return;
    }
    if (u.pathname === '/recovery') {
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(recovery)});
      res.end(recovery);
      return;
    }
    if (u.pathname === '/report') {
      try {
        resolveReport(JSON.parse(u.searchParams.get('data') || '{}'));
        res.writeHead(200);
        res.end('ok');
      } catch {
        res.writeHead(400);
        res.end('bad');
      }
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const {port}=server.address();
  return {
    server,
    report,
    heavy:`http://127.0.0.1:${port}/heavy`,
    recovery:`http://127.0.0.1:${port}/recovery`,
    reportUrl:`http://127.0.0.1:${port}/report`
  };
}

function makeExtension(s) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'c46-inflight-detach-'));
  const ext=path.join(root,'extension');
  fs.cpSync(ROOT,ext,{recursive:true,filter(src){const rel=path.relative(ROOT,src);if(!rel)return true;return !['.git','node_modules'].includes(rel.split(path.sep)[0])}});
  const mp=path.join(ext,'manifest.json');
  const m=JSON.parse(fs.readFileSync(mp,'utf8'));
  m.host_permissions=[...new Set([...(m.host_permissions||[]),'http://127.0.0.1/*'])];
  m.content_scripts=[...(m.content_scripts||[]),{matches:['http://127.0.0.1/*'],js:['content.js'],run_at:'document_start'}];
  fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');

  const sidecar=`\n(async()=>{\nconst out={ok:false,detachEvents:[]};\nconst sleep=ms=>new Promise(r=>setTimeout(r,ms));\nconst wait=async id=>{for(let i=0;i<180;i++){try{const t=await chrome.tabs.get(id);if(t.status==='complete')return}catch{}await sleep(100)}throw new Error('load timeout')};\nconst attached=async id=>Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===id)?.attached);\nlet first=null,second=null;\nlet interceptTabId=0;\nlet guardedPrintSettled=false;\nlet generationSettled=false;\nconst nativeTabsSendMessage=chrome.tabs.sendMessage;\nconst guardedSendCommand=chrome.debugger.sendCommand;\nconst onDetach=(source,reason)=>out.detachEvents.push({tabId:source?.tabId||0,reason:String(reason||''),at:Date.now()});\nchrome.debugger.onDetach.addListener(onDetach);\ntry{\n  await sleep(2500);\n  first=await chrome.tabs.create({url:${JSON.stringify(s.heavy)},active:false});\n  out.firstTabId=first.id;\n  await wait(first.id);\n  await sleep(350);\n  out.firstTitle=(await chrome.tabs.get(first.id)).title;\n  out.firstListener=(await nativeTabsSendMessage.call(chrome.tabs,first.id,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false}))?.ok===true;\n  out.firstAttachedBefore=await attached(first.id);\n  interceptTabId=first.id;\n\n  chrome.tabs.sendMessage=async function(tabId,message,...rest){\n    const response=await nativeTabsSendMessage.call(chrome.tabs,tabId,message,...rest);\n    if(Number(tabId)===Number(interceptTabId)&&message?.type==='WEBCLIP_PRINT_RENDER_STATE'&&message?.hidden===true&&!out.closeScheduledAt){\n      out.hiddenResponseAt=Date.now();\n      out.hiddenResponseOk=response?.ok===true;\n      out.closeScheduledAt=Date.now();\n      setTimeout(async()=>{\n        out.closeTimerFiredAt=Date.now();\n        out.guardedPrintSettledAtClose=guardedPrintSettled;\n        out.generationSettledAtClose=generationSettled;\n        try{out.attachedAtClose=await attached(interceptTabId)}catch(e){out.attachedAtCloseError=String(e?.message||e)}\n        try{await chrome.tabs.remove(interceptTabId);out.closeResolvedAt=Date.now()}catch(e){out.closeError=String(e?.message||e)}\n      },150);\n    }\n    return response;\n  };\n\n  chrome.debugger.sendCommand=function(debuggee,method,params){\n    if(Number(debuggee?.tabId)===Number(interceptTabId)&&method==='Page.printToPDF'){\n      out.guardedPrintEnteredAt=Date.now();\n      const pending=Promise.resolve(guardedSendCommand.call(chrome.debugger,debuggee,method,params));\n      pending.then(()=>{guardedPrintSettled=true;out.guardedPrintResolvedAt=Date.now()},e=>{guardedPrintSettled=true;out.guardedPrintRejectedAt=Date.now();out.guardedPrintError=String(e?.message||e)});\n      return pending;\n    }\n    return guardedSendCommand.call(chrome.debugger,debuggee,method,params);\n  };\n\n  out.generationStartedAt=Date.now();\n  const generation=Promise.resolve().then(()=>generatePdfBlob(first.id));\n  const firstOutcome=await Promise.race([\n    generation.then(async blob=>{generationSettled=true;const bytes=new Uint8Array(await blob.arrayBuffer());return {kind:'resolved',bytes:bytes.length,header:[...bytes.subarray(0,5)].map(x=>String.fromCharCode(x)).join(''),at:Date.now()}},e=>{generationSettled=true;return {kind:'rejected',error:String(e?.message||e),stack:String(e?.stack||''),at:Date.now()}}),\n    sleep(25000).then(()=>({kind:'timeout',at:Date.now()}))\n  ]);\n  out.firstOutcome=firstOutcome;\n  await sleep(800);\n  out.detachEventsAfterFirst=[...out.detachEvents];\n  out.firstTargetPresentAfter=Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===first.id));\n  out.firstActiveAfter=debuggerActiveTabs.has(first.id);\n  out.firstLateAfter=debuggerLateAttachCleanupByTab.has(first.id);\n  out.firstPendingDetachAfter=debuggerPendingDetachByTab.has(first.id);\n  out.firstPendingActualAfter=debuggerPendingActualSettlements.size;\n\n  chrome.tabs.sendMessage=nativeTabsSendMessage;\n  chrome.debugger.sendCommand=guardedSendCommand;\n  interceptTabId=0;\n\n  second=await chrome.tabs.create({url:${JSON.stringify(s.recovery)},active:false});\n  await wait(second.id);\n  await sleep(250);\n  out.secondTabId=second.id;\n  out.secondTitle=(await chrome.tabs.get(second.id)).title;\n  out.secondListener=(await chrome.tabs.sendMessage(second.id,{type:'WEBCLIP_PRINT_RENDER_STATE',hidden:false}))?.ok===true;\n  out.secondAttachedBefore=await attached(second.id);\n  const blob=await generatePdfBlob(second.id);\n  const bytes=new Uint8Array(await blob.arrayBuffer());\n  out.secondPdfBytes=bytes.length;\n  out.secondPdfHeader=[...bytes.subarray(0,5)].map(x=>String.fromCharCode(x)).join('');\n  out.secondAttachedAfter=await attached(second.id);\n  out.secondActiveAfter=debuggerActiveTabs.has(second.id);\n  out.secondLateAfter=debuggerLateAttachCleanupByTab.has(second.id);\n  out.secondPendingDetachAfter=debuggerPendingDetachByTab.has(second.id);\n  out.secondPendingActualAfter=debuggerPendingActualSettlements.size;\n  out.ok=true;\n}catch(e){out.error=String(e?.stack||e)}finally{\n  try{chrome.tabs.sendMessage=nativeTabsSendMessage}catch{}\n  try{chrome.debugger.sendCommand=guardedSendCommand}catch{}\n  chrome.debugger.onDetach.removeListener(onDetach);\n  try{\n    const target=second?.id||first?.id;\n    if(target)await chrome.tabs.update(target,{url:${JSON.stringify(s.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out))});\n    else await chrome.tabs.create({url:${JSON.stringify(s.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out)),active:false});\n  }catch(_){try{await chrome.tabs.create({url:${JSON.stringify(s.reportUrl)}+'?data='+encodeURIComponent(JSON.stringify(out)),active:false})}catch{}}\n}\n})();\n`;
  fs.appendFileSync(path.join(ext,'service-worker.js'),sidecar);
  return {root,ext};
}

const source=sourceChecks();
const s=await serverStart();
const temp=makeExtension(s);
let browser=null,proc=null;
try{
  browser=await puppeteer.launch({headless:false,pipe:false,enableExtensions:[temp.ext],args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check']});
  proc=browser.process();
  const target=await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().endsWith('/service-worker.js'),{timeout:30000});
  const browserVersion=await browser.version();
  const extensionId=new URL(target.url()).host;
  await browser.disconnect();
  browser=null;
  const result=await Promise.race([s.report,new Promise((_,reject)=>setTimeout(()=>reject(new Error('C46 in-flight detach report timeout')),120000))]);

  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.firstTitle,HEAVY_TITLE);
  assert.equal(result.firstListener,true);
  assert.equal(result.firstAttachedBefore,false);
  assert.equal(result.hiddenResponseOk,true);
  assert(Number(result.guardedPrintEnteredAt)>0,JSON.stringify(result));
  assert(Number(result.closeTimerFiredAt)>0,JSON.stringify(result));
  assert.equal(result.guardedPrintSettledAtClose,false,JSON.stringify(result));
  assert.equal(result.generationSettledAtClose,false,JSON.stringify(result));
  assert.equal(result.attachedAtClose,true,JSON.stringify(result));
  assert.equal(result.firstOutcome?.kind,'rejected',JSON.stringify(result.firstOutcome));
  assert.equal(result.firstTargetPresentAfter,false);
  assert(result.detachEventsAfterFirst.some(e=>e.tabId===result.firstTabId&&e.reason==='target_closed'),JSON.stringify(result.detachEventsAfterFirst));

  assert.equal(result.secondTitle,RECOVERY_TITLE);
  assert.equal(result.secondListener,true);
  assert.equal(result.secondAttachedBefore,false);
  assert(Number(result.secondPdfBytes)>1000,JSON.stringify(result));
  assert(String(result.secondPdfHeader).startsWith('%PDF-'));
  assert.equal(result.secondAttachedAfter,false);
  assert.equal(result.secondActiveAfter,false);
  assert.equal(result.secondLateAfter,false);
  assert.equal(result.secondPendingDetachAfter,false);
  assert.equal(result.secondPendingActualAfter,0);

  console.log('C46_INFLIGHT_DETACH_JSON='+JSON.stringify({source,browserVersion,extensionId,result}));
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(proc&&proc.exitCode==null){try{proc.kill('SIGTERM')}catch{}}
  await new Promise(r=>s.server.close(r));
  fs.rmSync(temp.root,{recursive:true,force:true});
}
