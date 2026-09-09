'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const chrome = process.env.CHROME_BIN;
if (!chrome) throw new Error('CHROME_BIN required');

const PORT = 18765;
const resultPromise = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('fixture timeout')), 30000);
  const server = http.createServer((req, res) => {
    if (req.url === '/page') {
      res.writeHead(200, {'content-type':'text/html'});
      res.end('<!doctype html><title>A1A2 fixture</title><h1>fixture</h1>');
      return;
    }
    if (req.url === '/result' && req.method === 'POST') {
      let body='';
      req.on('data', c => body += c);
      req.on('end', () => {
        clearTimeout(timer);
        res.writeHead(200, {'content-type':'text/plain'}); res.end('ok');
        try { resolve({server, data:JSON.parse(body)}); } catch (e) { reject(e); }
      });
      return;
    }
    res.writeHead(404); res.end('no');
  });
  server.listen(PORT, '127.0.0.1');
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-a1a2-'));
const ext = path.join(dir, 'ext'); fs.mkdirSync(ext);
const profile = path.join(dir, 'profile');
fs.writeFileSync(path.join(ext,'manifest.json'), JSON.stringify({
  manifest_version:3,
  name:'A1A2 DocumentId Fixture', version:'1.0.0',
  permissions:['tabs','scripting'],
  host_permissions:[`http://127.0.0.1:${PORT}/*`],
  background:{service_worker:'worker.js'},
  content_scripts:[{matches:[`http://127.0.0.1:${PORT}/*`],js:['content.js'],run_at:'document_start'}]
}));
fs.writeFileSync(path.join(ext,'content.js'), `
const realmNonce = crypto.randomUUID();
chrome.runtime.sendMessage({type:'HELLO', realmNonce}).catch(()=>{});
chrome.runtime.onMessage.addListener((m,s,send)=>{
  if(m?.type==='PROBE'){ send({ok:true, realmNonce, href:location.href}); return false; }
});
`);
fs.writeFileSync(path.join(ext,'worker.js'), `
const PORT=${PORT};
let hellos=[]; let running=false;
chrome.runtime.onMessage.addListener((m,s)=>{
  if(m?.type==='HELLO') hellos.push({documentId:s.documentId||'', frameId:s.frameId, documentLifecycle:s.documentLifecycle||'', realmNonce:m.realmNonce});
});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function waitHello(exclude=''){
  for(let i=0;i<200;i++){
    const h=[...hellos].reverse().find(x=>x.documentId && x.documentId!==exclude);
    if(h) return h; await sleep(50);
  }
  throw new Error('HELLO timeout');
}
async function waitComplete(tabId){
  for(let i=0;i<200;i++){ const t=await chrome.tabs.get(tabId); if(t.status==='complete') return; await sleep(50); }
  throw new Error('tab complete timeout');
}
async function run(){
  if(running) return; running=true;
  let tab;
  try{
    tab=await chrome.tabs.create({url:'http://127.0.0.1:${PORT}/page',active:false});
    await waitComplete(tab.id);
    const h1=await waitHello();
    const inj1=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({href:location.href})});
    const d1=String(inj1?.[0]?.documentId||'');
    const p1=await chrome.tabs.sendMessage(tab.id,{type:'PROBE'},{documentId:d1});
    await chrome.tabs.reload(tab.id);
    await waitComplete(tab.id);
    const h2=await waitHello(d1);
    const inj2=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({href:location.href})});
    const d2=String(inj2?.[0]?.documentId||'');
    let oldRejected=false, oldError='';
    try { await chrome.tabs.sendMessage(tab.id,{type:'PROBE'},{documentId:d1}); }
    catch(e){ oldRejected=true; oldError=String(e?.message||e); }
    const p2=await chrome.tabs.sendMessage(tab.id,{type:'PROBE'},{documentId:d2});
    const result={
      d1,d2,
      injectionMatchesSender1:d1===h1.documentId,
      injectionMatchesSender2:d2===h2.documentId,
      documentChanged:Boolean(d1&&d2&&d1!==d2),
      oldDocumentRejected:oldRejected,
      oldError,
      exactProbe1:p1?.realmNonce===h1.realmNonce,
      exactProbe2:p2?.realmNonce===h2.realmNonce,
      senderLifecycle1:h1.documentLifecycle,
      senderLifecycle2:h2.documentLifecycle,
      senderFrame1:h1.frameId,
      senderFrame2:h2.frameId
    };
    await fetch('http://127.0.0.1:${PORT}/result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});
  } catch(e) {
    await fetch('http://127.0.0.1:${PORT}/result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({error:String(e?.stack||e)})}).catch(()=>{});
  } finally { if(tab?.id) chrome.tabs.remove(tab.id).catch(()=>{}); }
}
chrome.runtime.onInstalled.addListener(()=>run());
chrome.runtime.onStartup.addListener(()=>run());
setTimeout(()=>run(),250);
`);

const child = spawn(chrome, [
  '--headless=new','--no-sandbox','--disable-gpu',
  `--user-data-dir=${profile}`,
  `--disable-extensions-except=${ext}`,
  `--load-extension=${ext}`,
  'about:blank'
], {stdio:['ignore','pipe','pipe']});
let stderr=''; child.stderr.on('data',d=>stderr += d.toString());

(async()=>{
  let server;
  try{
    const out=await resultPromise; server=out.server; const r=out.data;
    if(r.error) throw new Error(r.error);
    const checks={
      documentIdsPresent:Boolean(r.d1&&r.d2),
      injectionMatchesSender1:r.injectionMatchesSender1===true,
      injectionMatchesSender2:r.injectionMatchesSender2===true,
      documentChanged:r.documentChanged===true,
      oldDocumentRejected:r.oldDocumentRejected===true,
      exactProbe1:r.exactProbe1===true,
      exactProbe2:r.exactProbe2===true,
      topFrameSender:r.senderFrame1===0&&r.senderFrame2===0,
      activeLifecycle:r.senderLifecycle1==='active'&&r.senderLifecycle2==='active'
    };
    for(const [k,v] of Object.entries(checks)) if(!v) throw new Error(`FAIL ${k}: ${JSON.stringify(r)}`);
    console.log(`A1/A2 Chrome documentId fixture: PASS; cases=${Object.keys(checks).length}`);
    console.log(JSON.stringify(r));
  } finally {
    if(server) server.close();
    child.kill('SIGTERM');
    setTimeout(()=>child.kill('SIGKILL'),1000).unref();
  }
})().catch(e=>{ console.error(e.stack||e); console.error(stderr.slice(-4000)); child.kill('SIGKILL'); process.exitCode=1; });
