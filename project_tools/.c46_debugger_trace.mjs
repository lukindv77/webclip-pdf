#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const HEADLESS = process.env.C46_TRACE_HEADLESS === '1';

function startServer() {
  let resolveReport;
  const reportPromise = new Promise(resolve => { resolveReport = resolve; });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/fixture') {
      const body = '<!doctype html><meta charset="utf-8"><title>C46 debugger lifecycle</title><h1>C46_DEBUGGER_LIFECYCLE</h1>';
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-length':Buffer.byteLength(body)});
      res.end(body);
      return;
    }
    if (url.pathname === '/report') {
      let parsed = {};
      try { parsed = JSON.parse(url.searchParams.get('data') || '{}'); }
      catch (error) { parsed = {parseError:String(error)}; }
      resolveReport(parsed);
      res.writeHead(200, {'content-type':'text/plain','cache-control':'no-store'});
      res.end('ok');
      return;
    }
    res.writeHead(404); res.end('not found');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      resolve({server, fixture:`http://127.0.0.1:${port}/fixture`, report:`http://127.0.0.1:${port}/report`, reportPromise});
    });
  });
}

function injectedDriver(fixture, report) {
  const mode = HEADLESS ? 'headless' : 'headed';
  return `\n;(async()=>{\n` +
`const out={mode:${JSON.stringify(mode)},tests:[]};\n` +
`const sleep=ms=>new Promise(r=>setTimeout(r,ms));\n` +
`const bounded=(promise,label,ms=5000)=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>{const e=new Error(label+' timeout');e.code='C46_TIMEOUT';reject(e)},ms))]);\n` +
`const waitComplete=async id=>{for(let i=0;i<150;i++){const t=await bounded(chrome.tabs.get(id),'tabs.get');if(t.status==='complete')return;await sleep(100)}throw new Error('fixture-load-timeout')};\n` +
`const attached=async id=>Boolean((await bounded(chrome.debugger.getTargets(),'debugger.getTargets')).find(x=>x.tabId===id)?.attached);\n` +
`const send=(d,m,p,ms=5000)=>bounded(chrome.debugger.sendCommand(d,m,p),m,ms);\n` +
`const run=async(name,params)=>{const r={name,events:[],steps:[]};let tab,dbg;const detachListener=(source,reason)=>{if(tab&&source?.tabId===tab.id)r.events.push({event:'onDetach',reason:String(reason||'')})};chrome.debugger.onDetach.addListener(detachListener);try{tab=await bounded(chrome.tabs.create({url:${JSON.stringify(fixture)},active:false}),'tabs.create');dbg={tabId:tab.id};await waitComplete(tab.id);r.attachedBefore=await attached(tab.id);await bounded(chrome.debugger.attach(dbg,'1.3'),'debugger.attach',10000);r.attachedAfterAttach=await attached(tab.id);await send(dbg,'Page.enable');await send(dbg,'Runtime.enable');await send(dbg,'Emulation.setEmulatedMedia',{media:'screen'});try{r.printResult=await send(dbg,'Page.printToPDF',params,12000);r.printOk=true}catch(e){r.printOk=false;r.printError=String(e?.message||e);r.printErrorCode=String(e?.code||'')}try{r.attachedImmediatelyAfterPrint=await attached(tab.id)}catch(e){r.attachedImmediatelyAfterPrintError=String(e?.message||e)}for(const [label,method,p] of [['Page.getLayoutMetrics','Page.getLayoutMetrics',undefined],['Runtime.evaluate','Runtime.evaluate',{expression:'6*7',returnByValue:true}],['Page.captureScreenshot','Page.captureScreenshot',{format:'png'}]]){try{const v=await send(dbg,method,p,7000);r.steps.push({label,ok:true,summary:label==='Runtime.evaluate'?v?.result?.value:label==='Page.captureScreenshot'?String(v?.data||'').length:'ok'})}catch(e){r.steps.push({label,ok:false,error:String(e?.message||e),code:String(e?.code||'')})}}try{r.attachedAfterFollowups=await attached(tab.id)}catch(e){r.attachedAfterFollowupsError=String(e?.message||e)}await sleep(250);r.eventsBeforeExplicitDetach=[...r.events];try{await bounded(chrome.debugger.detach(dbg),'debugger.detach',10000);r.explicitDetachOk=true}catch(e){r.explicitDetachOk=false;r.explicitDetachError=String(e?.message||e)}await sleep(250);try{r.attachedAfterExplicitDetach=await attached(tab.id)}catch(e){r.attachedAfterExplicitDetachError=String(e?.message||e)}r.eventsAfterExplicitDetach=[...r.events]}catch(e){r.topError=String(e?.stack||e)}finally{chrome.debugger.onDetach.removeListener(detachListener);try{if(tab?.id)await bounded(chrome.tabs.remove(tab.id),'tabs.remove')}catch(_){}}out.tests.push(r)};\n` +
`await sleep(1200);await run('default',{printBackground:true,preferCSSPageSize:true});await run('base64',{printBackground:true,preferCSSPageSize:true,transferMode:'ReturnAsBase64'});await run('stream',{printBackground:true,preferCSSPageSize:true,transferMode:'ReturnAsStream'});\n` +
`const data=encodeURIComponent(JSON.stringify(out));await bounded(chrome.tabs.create({url:${JSON.stringify(report)}+'?data='+data,active:false}),'report.tabs.create',5000);\n` +
`})().catch(async e=>{const data=encodeURIComponent(JSON.stringify({mode:${JSON.stringify(mode)},fatal:String(e?.stack||e)}));try{await chrome.tabs.create({url:${JSON.stringify(report)}+'?data='+data,active:false})}catch(_){}});\n`;
}

const fixture = await startServer();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `c46-lifecycle-${HEADLESS?'headless':'headed'}-`));
const extension = path.join(temp, 'extension');
fs.cpSync(ROOT, extension, {recursive:true, filter(src){const rel=path.relative(ROOT,src);if(!rel)return true;return !['.git','node_modules'].includes(rel.split(path.sep)[0]);}});
fs.appendFileSync(path.join(extension, 'service-worker.js'), injectedDriver(fixture.fixture, fixture.report));

let browser, browserProcess;
try {
  browser = await puppeteer.launch({headless:HEADLESS, pipe:false, enableExtensions:[extension], args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check']});
  browserProcess = browser.process();
  const target = await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().endsWith('/service-worker.js'), {timeout:30000});
  console.log('C46_LIFECYCLE_MODE='+(HEADLESS?'headless':'headed'));
  console.log('C46_LIFECYCLE_BROWSER='+await browser.version());
  console.log('C46_LIFECYCLE_EXTENSION_ID='+new URL(target.url()).host);
  await browser.disconnect(); browser=null;
  const result = await Promise.race([fixture.reportPromise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('C46 lifecycle report timeout')),90000))]);
  console.log('C46_LIFECYCLE_JSON='+JSON.stringify(result));
} finally {
  if(browser){try{await browser.close()}catch(_){}}
  if(browserProcess&&browserProcess.exitCode==null){try{browserProcess.kill('SIGTERM')}catch(_){}}
  await new Promise(resolve=>fixture.server.close(resolve));
  fs.rmSync(temp,{recursive:true,force:true});
}
