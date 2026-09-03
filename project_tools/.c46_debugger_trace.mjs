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
      const body = '<!doctype html><meta charset="utf-8"><title>C46 print transport fixture</title><h1>C46_PRINT_TRANSPORT</h1>';
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }
    if (url.pathname === '/report') {
      const raw = url.searchParams.get('data') || '{}';
      let parsed = {};
      try { parsed = JSON.parse(raw); }
      catch (error) { parsed = { parseError: String(error), raw: raw.slice(0, 1000) }; }
      resolveReport(parsed);
      res.writeHead(200, {'content-type': 'text/plain', 'cache-control': 'no-store'});
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      resolve({
        server,
        fixture: `http://127.0.0.1:${port}/fixture`,
        report: `http://127.0.0.1:${port}/report`,
        reportPromise,
      });
    });
  });
}

function driver(fixture, report) {
  const mode = HEADLESS ? 'headless' : 'headed';
  return `\n\n(async()=>{\n` +
`const out={ok:true,mode:${JSON.stringify(mode)},variants:[],production:null};\n` +
`const waitComplete=async(tabId)=>{for(let i=0;i<150;i++){const t=await chrome.tabs.get(tabId);if(t.status==='complete')return t;await new Promise(r=>setTimeout(r,100));}throw new Error('fixture-load-timeout')};\n` +
`const digestBytes=async(bytes)=>{const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return [...d].map(x=>x.toString(16).padStart(2,'0')).join('')};\n` +
`const decodeBase64=(text)=>{const bin=atob(String(text||''));const b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b};\n` +
`const runVariant=async(name,extra)=>{const r={name,ok:false,trace:[]};let tab=null,debuggee=null,stream='';const rec=async(step,fn)=>{const t={step};r.trace.push(t);try{const v=await fn();t.ok=true;return v}catch(e){t.ok=false;t.error=String(e?.message||e);throw e}};try{tab=await rec('tabs.create',()=>chrome.tabs.create({url:${JSON.stringify(fixture)},active:false}));debuggee={tabId:tab.id};await rec('tab.complete',()=>waitComplete(tab.id));const before=await rec('debugger.getTargets.before',()=>chrome.debugger.getTargets());r.attachedBefore=Boolean(before.find(x=>x.tabId===tab.id)?.attached);await rec('debugger.attach',()=>chrome.debugger.attach(debuggee,'1.3'));await rec('Page.enable',()=>chrome.debugger.sendCommand(debuggee,'Page.enable'));await rec('Emulation.setEmulatedMedia',()=>chrome.debugger.sendCommand(debuggee,'Emulation.setEmulatedMedia',{media:'screen'}));const params={landscape:false,displayHeaderFooter:false,printBackground:true,scale:1,preferCSSPageSize:true,...extra};const printed=await rec('Page.printToPDF',()=>chrome.debugger.sendCommand(debuggee,'Page.printToPDF',params));r.hasData=typeof printed?.data==='string'&&printed.data.length>0;r.hasStream=typeof printed?.stream==='string'&&printed.stream.length>0;if(r.hasData){const bytes=decodeBase64(printed.data);r.pdfBytes=bytes.length;r.pdfSha256=await digestBytes(bytes);r.pdfHeaderHex=[...bytes.subarray(0,8)].map(x=>x.toString(16).padStart(2,'0')).join('')}if(r.hasStream){stream=printed.stream;const chunks=[];let total=0,eof=false;while(!eof){const chunk=await rec('IO.read',()=>chrome.debugger.sendCommand(debuggee,'IO.read',{handle:stream,size:1024*1024}));const raw=String(chunk?.data||'');let bytes;if(chunk?.base64Encoded){bytes=decodeBase64(raw)}else{bytes=new TextEncoder().encode(raw)}chunks.push(bytes);total+=bytes.length;if(total>8*1024*1024)throw new Error('trace-pdf-too-large');eof=Boolean(chunk?.eof)}await rec('IO.close',()=>chrome.debugger.sendCommand(debuggee,'IO.close',{handle:stream}));stream='';const joined=new Uint8Array(total);let off=0;for(const c of chunks){joined.set(c,off);off+=c.length}r.pdfBytes=joined.length;r.pdfSha256=await digestBytes(joined);r.pdfHeaderHex=[...joined.subarray(0,8)].map(x=>x.toString(16).padStart(2,'0')).join('')}await rec('debugger.detach',()=>chrome.debugger.detach(debuggee));const after=await rec('debugger.getTargets.after',()=>chrome.debugger.getTargets());r.attachedAfter=Boolean(after.find(x=>x.tabId===tab.id)?.attached);r.ok=true}catch(e){r.error=String(e?.stack||e?.message||e);try{if(stream)await chrome.debugger.sendCommand(debuggee,'IO.close',{handle:stream})}catch(_){}try{if(debuggee)await chrome.debugger.detach(debuggee)}catch(_){}}finally{try{if(tab?.id)await chrome.tabs.remove(tab.id)}catch(_){}}return r};\n` +
`const runProduction=async()=>{const r={ok:false};let tab=null;try{tab=await chrome.tabs.create({url:${JSON.stringify(fixture)},active:false});r.tabId=tab.id;await waitComplete(tab.id);r.attachedBefore=Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===tab.id)?.attached);const blob=await generatePdfBlob(tab.id);const bytes=new Uint8Array(await blob.arrayBuffer());r.pdfBytes=bytes.length;r.pdfSha256=await digestBytes(bytes);r.pdfHeaderHex=[...bytes.subarray(0,8)].map(x=>x.toString(16).padStart(2,'0')).join('');r.attachedAfter=Boolean((await chrome.debugger.getTargets()).find(x=>x.tabId===tab.id)?.attached);r.debuggerActiveSetAfter=debuggerActiveTabs.has(tab.id);r.debuggerLateAttachCleanupAfter=debuggerLateAttachCleanupByTab.has(tab.id);r.debuggerPendingDetachAfter=debuggerPendingDetachByTab.has(tab.id);r.debuggerPendingActualSettlementCountAfter=debuggerPendingActualSettlements.size;r.ok=true}catch(e){r.error=String(e?.stack||e?.message||e)}finally{try{if(tab?.id)await chrome.tabs.remove(tab.id)}catch(_){}}return r};\n` +
`const send=async()=>{const data=encodeURIComponent(JSON.stringify(out));try{await chrome.tabs.create({url:${JSON.stringify(report)}+'?data='+data,active:false})}catch(_){}};\n` +
`try{await new Promise(r=>setTimeout(r,1500));out.variants.push(await runVariant('default',{}));out.variants.push(await runVariant('ReturnAsBase64',{transferMode:'ReturnAsBase64'}));out.variants.push(await runVariant('ReturnAsStream',{transferMode:'ReturnAsStream'}));out.production=await runProduction()}catch(e){out.ok=false;out.topError=String(e?.stack||e?.message||e)}await send();\n` +
`})();\n`;
}

async function puppeteerPdfControl(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'load'});
    const pdf = await page.pdf({printBackground: true});
    return {
      browserVersion: await browser.version(),
      bytes: pdf.length,
      sha256: crypto.createHash('sha256').update(pdf).digest('hex'),
      header: Buffer.from(pdf).subarray(0, 5).toString('ascii'),
    };
  } finally {
    await browser.close();
  }
}

const fixture = await startServer();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `c46-transfer-${HEADLESS ? 'headless' : 'headed'}-`));
const extension = path.join(temp, 'extension');
fs.cpSync(ROOT, extension, {
  recursive: true,
  filter(src) {
    const rel = path.relative(ROOT, src);
    if (!rel) return true;
    return !['.git', 'node_modules'].includes(rel.split(path.sep)[0]);
  },
});
fs.appendFileSync(path.join(extension, 'service-worker.js'), driver(fixture.fixture, fixture.report));

let browser;
let browserProcess;
try {
  const control = await puppeteerPdfControl(fixture.fixture);
  console.log('C46_PUPPETEER_PDF_CONTROL=' + JSON.stringify(control));
  browser = await puppeteer.launch({
    headless: HEADLESS,
    pipe: false,
    enableExtensions: [extension],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  });
  browserProcess = browser.process();
  const target = await browser.waitForTarget(
    t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'),
    {timeout: 30000},
  );
  console.log('C46_TRANSFER_MODE=' + (HEADLESS ? 'headless' : 'headed'));
  console.log('C46_TRANSFER_EXTENSION_ID=' + new URL(target.url()).host);
  console.log('C46_TRANSFER_BROWSER=' + await browser.version());
  await browser.disconnect();
  browser = null;
  const result = await Promise.race([
    fixture.reportPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('C46 transfer report timeout')), 60000)),
  ]);
  console.log('C46_TRANSFER_JSON=' + JSON.stringify(result));
} finally {
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  if (browserProcess && browserProcess.exitCode == null) {
    try { browserProcess.kill('SIGTERM'); } catch (_) {}
  }
  await new Promise(resolve => fixture.server.close(resolve));
  fs.rmSync(temp, {recursive: true, force: true});
}
