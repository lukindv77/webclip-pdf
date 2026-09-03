#!/usr/bin/env node
import crypto from 'node:crypto';
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
      const body = '<!doctype html><meta charset="utf-8"><title>C46 debugger trace fixture</title><h1>C46_TRACE</h1>';
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(body)}); res.end(body); return;
    }
    if (url.pathname === '/report') {
      const raw = url.searchParams.get('data') || '{}';
      let parsed = {};
      try { parsed = JSON.parse(raw); } catch (error) { parsed = {parseError:String(error), raw}; }
      resolveReport(parsed);
      res.writeHead(200, {'content-type':'text/plain'}); res.end('ok'); return;
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

function driver(fixture, report) {
  return `\n\n(async()=>{\nconst out={ok:false,mode:${JSON.stringify(HEADLESS ? 'headless' : 'headed')},trace:[]}; let tab=null; let debuggee=null; let stream='';\nconst rec=async(name,fn)=>{const t={name};out.trace.push(t);try{const v=await fn();t.ok=true;return v}catch(e){t.ok=false;t.error=String(e?.message||e);throw e}};\nconst send=async()=>{const data=encodeURIComponent(JSON.stringify(out));try{if(tab?.id)await chrome.tabs.update(tab.id,{url:${JSON.stringify(report)}+'?data='+data});else await chrome.tabs.create({url:${JSON.stringify(report)}+'?data='+data,active:false})}catch(_){}};\ntry{\n await new Promise(r=>setTimeout(r,1200));\n tab=await rec('tabs.create',()=>chrome.tabs.create({url:${JSON.stringify(fixture)},active:false})); debuggee={tabId:tab.id};\n await rec('tab.complete',async()=>{for(let i=0;i<100;i++){const t=await chrome.tabs.get(tab.id);if(t.status==='complete')return t;await new Promise(r=>setTimeout(r,100));}throw new Error('load timeout')});\n const before=await rec('debugger.getTargets.before',()=>chrome.debugger.getTargets()); out.attachedBefore=Boolean(before.find(x=>x.tabId===tab.id)?.attached);\n await rec('debugger.attach.direct',()=>chrome.debugger.attach(debuggee,'1.3'));\n await rec('debugger.send.Page.enable',()=>chrome.debugger.sendCommand(debuggee,'Page.enable'));\n await rec('debugger.send.Emulation.setEmulatedMedia',()=>chrome.debugger.sendCommand(debuggee,'Emulation.setEmulatedMedia',{media:'screen'}));\n const print=await rec('debugger.send.Page.printToPDF',()=>chrome.debugger.sendCommand(debuggee,'Page.printToPDF',{landscape:false,displayHeaderFooter:false,printBackground:true,scale:1,preferCSSPageSize:true,transferMode:'ReturnAsStream'})); stream=String(print?.stream||''); out.streamPresent=Boolean(stream);\n if(stream){let encodedChars=0,eof=false;while(!eof){const chunk=await rec('debugger.send.IO.read',()=>chrome.debugger.sendCommand(debuggee,'IO.read',{handle:stream,size:1024*1024}));const data=String(chunk?.data||'');encodedChars+=data.length;eof=Boolean(chunk?.eof);if(encodedChars>8*1024*1024)throw new Error('trace stream too large');}out.streamEncodedChars=encodedChars;await rec('debugger.send.IO.close',()=>chrome.debugger.sendCommand(debuggee,'IO.close',{handle:stream}));stream=''}\n await rec('debugger.detach.direct',()=>chrome.debugger.detach(debuggee));\n const afterDirect=await rec('debugger.getTargets.afterDirect',()=>chrome.debugger.getTargets()); out.attachedAfterDirect=Boolean(afterDirect.find(x=>x.tabId===tab.id)?.attached);\n await rec('production.generatePdfBlob',async()=>{const blob=await generatePdfBlob(tab.id);out.productionPdfBytes=blob.size;const bytes=new Uint8Array(await blob.arrayBuffer());const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));out.productionPdfSha256=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');return blob.size});\n const afterProd=await rec('debugger.getTargets.afterProduction',()=>chrome.debugger.getTargets());out.attachedAfterProduction=Boolean(afterProd.find(x=>x.tabId===tab.id)?.attached);\n out.debuggerActiveSetAfter=debuggerActiveTabs.has(tab.id);out.debuggerLateAttachCleanupAfter=debuggerLateAttachCleanupByTab.has(tab.id);out.debuggerPendingDetachAfter=debuggerPendingDetachByTab.has(tab.id);out.debuggerPendingActualSettlementCountAfter=debuggerPendingActualSettlements.size;\n out.ok=true;\n}catch(e){out.error=String(e?.stack||e?.message||e);try{if(stream)await chrome.debugger.sendCommand(debuggee,'IO.close',{handle:stream})}catch(_){}try{if(debuggee)await chrome.debugger.detach(debuggee)}catch(_){}}\nawait send();\n})();\n`;
}

async function puppeteerPdfControl(url) {
  const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.goto(url, {waitUntil:'load'});
    const pdf = await page.pdf({printBackground:true});
    return {
      browserVersion: await browser.version(),
      bytes: pdf.length,
      sha256: crypto.createHash('sha256').update(pdf).digest('hex'),
      header: Buffer.from(pdf).subarray(0,5).toString('ascii'),
    };
  } finally {
    await browser.close();
  }
}

const fixture = await startServer();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `c46-trace-${HEADLESS ? 'headless' : 'headed'}-`));
const extension = path.join(temp, 'extension');
fs.cpSync(ROOT, extension, {recursive:true, filter(src){const rel=path.relative(ROOT,src);if(!rel)return true;return !['.git','node_modules'].includes(rel.split(path.sep)[0]);}});
fs.appendFileSync(path.join(extension,'service-worker.js'), driver(fixture.fixture, fixture.report));
let browser;
let browserProcess;
try {
  const control = await puppeteerPdfControl(fixture.fixture);
  console.log('C46_PUPPETEER_PDF_CONTROL='+JSON.stringify(control));
  browser = await puppeteer.launch({headless:HEADLESS,pipe:false,enableExtensions:[extension],args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check']});
  browserProcess = browser.process();
  const target = await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().endsWith('/service-worker.js'),{timeout:30000});
  console.log('C46_TRACE_MODE='+(HEADLESS?'headless':'headed'));
  console.log('C46_TRACE_EXTENSION_ID='+new URL(target.url()).host);
  console.log('C46_TRACE_BROWSER='+await browser.version());
  await browser.disconnect(); browser=null;
  const result = await Promise.race([fixture.reportPromise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('trace report timeout')),30000))]);
  console.log('C46_TRACE_JSON='+JSON.stringify(result));
} finally {
  if(browser)try{await browser.close()}catch(_){}
  if(browserProcess&&browserProcess.exitCode==null)try{browserProcess.kill('SIGTERM')}catch(_){}
  await new Promise(resolve=>fixture.server.close(resolve));
  fs.rmSync(temp,{recursive:true,force:true});
}
