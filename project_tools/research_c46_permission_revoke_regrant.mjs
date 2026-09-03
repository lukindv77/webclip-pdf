#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const FRAME_AGENT = fs.readFileSync(path.join(ROOT, 'frame-agent.js'), 'utf8');
const TOP_PATTERN = 'http://127.0.0.1/*';
const CHILD_PATTERN = 'http://127.0.0.2/*';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceChecks() {
  assert.equal(MANIFEST.version, '0.9.8');
  assert((MANIFEST.optional_host_permissions || []).includes('http://*/*'));
  assert(WORKER.includes('const frameAgentsByTab = new Map()'));
  assert(WORKER.includes('async function frameAgentHasGrantedHostPermission'));
  assert(WORKER.includes('async function sendFrameAgentCommand'));
  assert(!WORKER.includes('chrome.permissions.onRemoved.addListener'));
  assert(FRAME_AGENT.includes('__WEBCLIP_FRAME_AGENT_LOADED__'));
  assert(FRAME_AGENT.includes("chrome.runtime.sendMessage({ type: 'WEBCLIP_FRAME_AGENT_REGISTER' })"));
  assert(FRAME_AGENT.includes("document.addEventListener('click',click,true)"));
  return {
    manifestVersion: MANIFEST.version,
    optionalHttpHost: true,
    productionPermissionsOnRemovedListener: false,
    frameAgentDuplicateSentinel: true
  };
}

async function bounded(promise, ms, label) {
  return Promise.race([
    Promise.resolve(promise),
    sleep(ms).then(() => { throw new Error(label + ' timeout'); })
  ]);
}

async function startServer() {
  const events = [];
  const gates = new Map();
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/top') {
      const body = `<!doctype html><meta charset="utf-8"><title>C46 permission top</title><h1>TOP</h1><iframe id="child" src="http://127.0.0.2:${server.address().port}/child" style="width:760px;height:520px"></iframe>`;
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(body)});
      res.end(body);
      return;
    }
    if (u.pathname === '/child') {
      const body = '<!doctype html><meta charset="utf-8"><title>C46 permission child</title><style>body{font:18px sans-serif;padding:20px}.target{display:block;width:300px;height:72px;margin:18px;padding:12px;border:2px solid #333}</style><div id="target0" class="target">POSITIVE_CONTROL</div><div id="target1" class="target">AFTER_REVOKE</div><div id="target2" class="target">AFTER_REGISTRY_DROP</div>';
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(body)});
      res.end(body);
      return;
    }
    if (u.pathname === '/event') {
      try {
        const kind = String(u.searchParams.get('kind') || 'unknown');
        const data = JSON.parse(u.searchParams.get('data') || '{}');
        events.push({ kind, data, receivedAt: Date.now() });
        res.writeHead(200, {'content-type':'text/plain'});
        res.end('ok');
      } catch (error) {
        res.writeHead(400, {'content-type':'text/plain'});
        res.end(String(error?.message || error));
      }
      return;
    }
    if (u.pathname === '/gate') {
      const name = String(u.searchParams.get('name') || '');
      const at = Number(gates.get(name) || 0);
      res.writeHead(at ? 200 : 425, {'content-type':'application/json','cache-control':'no-store'});
      res.end(JSON.stringify({ok:Boolean(at), at}));
      return;
    }
    res.writeHead(404, {'content-type':'text/plain'});
    res.end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '0.0.0', resolve);
  });
  const port = server.address().port;
  return {
    server,
    topUrl: `http://127.0.0.1:${port}/top`,
    childUrl: `http://127.0.0.2:${port}/child`,
    eventUrl: `http://127.0.0.1:${port}/event`,
    gateUrl: `http://127.0.0.1:${port}/gate`,
    setGate(name) { gates.set(name, Date.now()); },
    async waitEvent(kind, timeoutMs = 30000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const item = events.find((entry) => entry.kind === kind);
        if (item) return item.data;
        const fatal = events.find((entry) => entry.kind === 'fatal');
        if (fatal) throw new Error(`Worker sidecar fatal before ${kind}: ${JSON.stringify(fatal.data)}`);
        await sleep(100);
      }
      throw new Error(`Timed out waiting for event ${kind}`);
    }
  };
}

function makeExtension(s) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c46-permission-revoke-'));
  const ext = path.join(root, 'extension');
  const profile = path.join(root, 'profile');
  fs.cpSync(ROOT, ext, {
    recursive: true,
    filter(src) {
      const rel = path.relative(ROOT, src);
      if (!rel) return true;
      return !['.git', 'node_modules'].includes(rel.split(path.sep)[0]);
    }
  });
  fs.mkdirSync(profile, { recursive: true });

  const manifest = structuredClone(MANIFEST);
  manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), TOP_PATTERN])];
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  fs.writeFileSync(path.join(ext, 'probe.html'), '<!doctype html><meta charset="utf-8"><title>C46 permission probe</title><button id="grant">Grant child host</button><script src="probe.js"></script>\n');
  fs.writeFileSync(path.join(ext, 'probe.js'), `const P=${JSON.stringify(CHILD_PATTERN)};document.getElementById('grant').addEventListener('click',async()=>{document.body.dataset.started=String(Date.now());try{const granted=await chrome.permissions.request({origins:[P]});document.body.dataset.granted=String(Boolean(granted));}catch(e){document.body.dataset.granted='error';document.body.dataset.error=String(e?.message||e)}finally{document.body.dataset.settled=String(Date.now())}});\n`);

  const sidecar = `\n(async()=>{\nconst CHILD_PATTERN=${JSON.stringify(CHILD_PATTERN)};\nconst TOP_URL=${JSON.stringify(s.topUrl)};\nconst EVENT_URL=${JSON.stringify(s.eventUrl)};\nconst GATE_URL=${JSON.stringify(s.gateUrl)};\nconst sleep=ms=>new Promise(r=>setTimeout(r,ms));\nconst permissionEvents=[];\ntry{chrome.permissions.onAdded.addListener(p=>permissionEvents.push({kind:'added',permissions:p,at:Date.now()}));}catch{}\ntry{chrome.permissions.onRemoved.addListener(p=>permissionEvents.push({kind:'removed',permissions:p,at:Date.now()}));}catch{}\nconst emit=(kind,data)=>fetch(EVENT_URL+'?kind='+encodeURIComponent(kind)+'&data='+encodeURIComponent(JSON.stringify(data)),{cache:'no-store'}).catch(()=>{});\nconst waitGate=async name=>{for(let i=0;i<400;i++){try{const r=await fetch(GATE_URL+'?name='+encodeURIComponent(name),{cache:'no-store'});if(r.ok)return await r.json()}catch{}await sleep(100)}throw new Error('gate timeout '+name)};\nconst waitTab=async id=>{for(let i=0;i<300;i++){try{const t=await chrome.tabs.get(id);if(t.status==='complete')return t}catch{}await sleep(100)}throw new Error('tab load timeout')};\nconst hasPermission=()=>chrome.permissions.contains({origins:[CHILD_PATTERN]}).catch(()=>false);\nconst waitPermission=async expected=>{for(let i=0;i<300;i++){if(Boolean(await hasPermission())===Boolean(expected))return true;await sleep(100)}throw new Error('permission state timeout '+expected)};\ntry{\n  await emit('worker-ready',{manifestVersion:chrome.runtime.getManifest().version,permissionInitially:await hasPermission(),permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('initial-granted');\n  await waitPermission(true);\n  const top=await chrome.tabs.create({url:TOP_URL,active:false});\n  await waitTab(top.id);\n  const enableInitial=await enableFrameAgentsForTab(top.id);\n  let records=[];\n  for(let i=0;i<160;i++){records=listRegisteredFrameAgents(top.id);if(records.length)break;await sleep(100)}\n  if(!records.length)throw new Error('frame agent did not register after initial grant');\n  const frameId=Number(records[0].frameId);\n  const startResult=await sendFrameAgentCommand(top.id,frameId,'start',{mode:'include'});\n  const startState=await sendFrameAgentCommand(top.id,frameId,'get-state');\n  await emit('armed',{topTabId:top.id,frameId,enableInitial,records,startResult,startState,permissionAfterGrant:await hasPermission(),permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('positive-clicked');\n  const beforeRevokeState=await sendFrameAgentCommand(top.id,frameId,'get-state');\n  const removeResult=await chrome.permissions.remove({origins:[CHILD_PATTERN]});\n  await waitPermission(false);\n  await sleep(250);\n  const registryAfterRevoke=listRegisteredFrameAgents(top.id);\n  await emit('revoked',{removeResult,permissionAfterRevoke:await hasPermission(),registryAfterRevoke,beforeRevokeState,permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('after-revoke-clicked');\n  let commandResult=null,commandError='';\n  try{commandResult=await sendFrameAgentCommand(top.id,frameId,'get-state')}catch(error){commandError=String(error?.message||error)}\n  const registryAfterCommand=listRegisteredFrameAgents(top.id);\n  await emit('post-command',{commandResult,commandError,registryAfterCommand,permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('after-registry-drop-clicked');\n  await waitGate('regrant-requested');\n  await waitPermission(true);\n  const enableAfterRegrant=await enableFrameAgentsForTab(top.id);\n  let reRecords=[];\n  for(let i=0;i<160;i++){reRecords=listRegisteredFrameAgents(top.id);if(reRecords.length)break;await sleep(100)}\n  if(!reRecords.length)throw new Error('frame agent did not register after regrant');\n  const reFrameId=Number(reRecords[0].frameId);\n  const stateAfterRegrant=await sendFrameAgentCommand(top.id,reFrameId,'get-state');\n  const cleanup=await sendFrameAgentCommand(top.id,reFrameId,'stop',{clear:true});\n  await emit('final',{permissionAfterRegrant:await hasPermission(),enableAfterRegrant,reRecords,stateAfterRegrant,cleanup,permissionEvents:[...permissionEvents],at:Date.now()});\n}catch(error){await emit('fatal',{error:String(error?.stack||error),permissionEvents:[...permissionEvents],at:Date.now()});}\n})();\n`;
  fs.appendFileSync(path.join(ext, 'service-worker.js'), sidecar);
  return { root, ext, profile };
}

async function launchExtension(temp) {
  return bounded(puppeteer.launch({
    headless: false,
    pipe: false,
    userDataDir: temp.profile,
    enableExtensions: [temp.ext],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']
  }), 40000, 'browser launch');
}

async function workerTarget(browser) {
  const existing = browser.targets().find(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'));
  if (existing) return existing;
  return bounded(browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'), { timeout: 12000 }), 15000, 'service worker target');
}

async function workerContains(browser) {
  const deadline = Date.now() + 7000;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const target = await workerTarget(browser);
      const worker = await bounded(target.worker(), 3000, 'worker object');
      if (!worker) throw new Error('worker object unavailable');
      return await bounded(worker.evaluate((pattern) => chrome.permissions.contains({origins:[pattern]}), CHILD_PATTERN), 3000, 'worker contains');
    } catch (error) {
      lastError = String(error?.message || error);
      await sleep(100);
    }
  }
  throw new Error('workerContains failed: ' + lastError);
}

function xdotool(args, allowFail = false) {
  try {
    return execFileSync('xdotool', args, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
  } catch (error) {
    if (!allowFail) throw error;
    return '';
  }
}

async function openProbe(browser, extensionId) {
  const page = await bounded(browser.newPage(), 5000, 'probe newPage');
  await bounded(page.goto(`chrome-extension://${extensionId}/probe.html`, {waitUntil:'domcontentloaded',timeout:10000}), 12000, 'probe goto');
  await bounded(page.bringToFront(), 3000, 'probe bringToFront');
  return page;
}

async function firstGrantWithNativePrompt(browser, extensionId) {
  const probe = await openProbe(browser, extensionId);
  try {
    assert.equal(await workerContains(browser), false);
    await bounded(probe.click('#grant'), 3000, 'initial grant click');
    await sleep(850);
    xdotool(['key','--clearmodifiers','Tab','Return']);
    const deadline=Date.now()+6000;
    while(Date.now()<deadline){
      try{if(await workerContains(browser))return{granted:true,sequence:['Tab','Return']}}catch{}\n      await sleep(100);
    }
    xdotool(['key','--clearmodifiers','Escape'],true);
    return{granted:false,sequence:['Tab','Return']};
  } finally {
    try{await bounded(probe.close(),3000,'initial probe close')}catch{}
  }
}

async function regrantFromGrantedHistory(browser, extensionId) {
  const probe = await openProbe(browser, extensionId);
  const requestedAt=Date.now();
  try {
    assert.equal(await workerContains(browser), false);
    await bounded(probe.click('#grant'), 3000, 'regrant click');
    const deadline=Date.now()+4500;
    while(Date.now()<deadline){
      try{if(await workerContains(browser))return{granted:true,requestedAt,observedAt:Date.now(),nativeKeyInput:false}}catch{}\n      await sleep(100);
    }
    return{granted:false,requestedAt,observedAt:Date.now(),nativeKeyInput:false};
  } finally {
    try{await bounded(probe.close(),3000,'regrant probe close')}catch{}
  }
}

async function waitForChildFrame(page, childUrl) {
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
    const frame=page.frames().find(item=>item.url()===childUrl);
    if(frame)return frame;
    await sleep(100);
  }
  throw new Error('Child frame not found: '+childUrl);
}

const source=sourceChecks();
const s=await startServer();
const temp=makeExtension(s);
let browser=null;
try{
  browser=await launchExtension(temp);
  const wt=await workerTarget(browser);
  const extensionId=new URL(wt.url()).host;
  const browserVersion=await browser.version();
  const workerReady=await s.waitEvent('worker-ready',30000);
  assert.equal(workerReady.permissionInitially,false,JSON.stringify(workerReady));

  const initialGrant=await firstGrantWithNativePrompt(browser,extensionId);
  assert.equal(initialGrant.granted,true,JSON.stringify(initialGrant));
  assert.equal(await workerContains(browser),true);
  s.setGate('initial-granted');

  const armed=await s.waitEvent('armed',30000);
  assert.equal(armed.permissionAfterGrant,true,JSON.stringify(armed));
  assert(Number(armed.frameId)>0,JSON.stringify(armed));
  assert.equal(armed.startState?.phase,'selecting',JSON.stringify(armed));

  const topTarget=await bounded(browser.waitForTarget(t=>t.url()===s.topUrl,{timeout:15000}),18000,'top target');
  const topPage=await topTarget.page();
  assert(topPage,'top target has no page');
  const child=await waitForChildFrame(topPage,s.childUrl);

  await child.click('#target0');
  await sleep(250);
  const positiveControlAttr=await child.$eval('#target0',el=>el.getAttribute('data-webclip-remote-include'));
  assert(positiveControlAttr,'positive-control frame-agent click did not select target0');
  s.setGate('positive-clicked');

  const revoked=await s.waitEvent('revoked',30000);
  assert.equal(revoked.removeResult,true,JSON.stringify(revoked));
  assert.equal(revoked.permissionAfterRevoke,false,JSON.stringify(revoked));
  assert.equal(Array.isArray(revoked.registryAfterRevoke)?revoked.registryAfterRevoke.length:-1,1,JSON.stringify(revoked));

  await child.click('#target1');
  await sleep(250);
  const afterRevokeAttr=await child.$eval('#target1',el=>el.getAttribute('data-webclip-remote-include'));
  s.setGate('after-revoke-clicked');

  const postCommand=await s.waitEvent('post-command',30000);
  assert.match(String(postCommand.commandError||''),/permission|Host permission|отозван/i,JSON.stringify(postCommand));
  assert.equal(Array.isArray(postCommand.registryAfterCommand)?postCommand.registryAfterCommand.length:-1,0,JSON.stringify(postCommand));

  await child.click('#target2');
  await sleep(250);
  const afterRegistryDropAttr=await child.$eval('#target2',el=>el.getAttribute('data-webclip-remote-include'));
  s.setGate('after-registry-drop-clicked');

  const regrant=await regrantFromGrantedHistory(browser,extensionId);
  assert.equal(regrant.granted,true,JSON.stringify(regrant));
  s.setGate('regrant-requested');

  const final=await s.waitEvent('final',30000);
  assert.equal(final.permissionAfterRegrant,true,JSON.stringify(final));
  const includesAfterRegrant=Array.isArray(final?.stateAfterRegrant?.snapshot?.includes)?final.stateAfterRegrant.snapshot.includes.length:-1;
  const removedEvents=(revoked.permissionEvents||[]).filter(event=>event?.kind==='removed');
  const finalAddedEvents=(final.permissionEvents||[]).filter(event=>event?.kind==='added');
  const staleAfterRevoke=Boolean(afterRevokeAttr);
  const staleAfterRegistryDrop=Boolean(afterRegistryDropAttr);
  const preservedAcrossRegrant=includesAfterRegrant>=3&&final?.stateAfterRegrant?.phase==='selecting';

  let verdict='NO_STALE_FRAME_AGENT_ACTIVITY_OBSERVED';
  if(staleAfterRevoke&&staleAfterRegistryDrop&&preservedAcrossRegrant){
    verdict='STALE_FRAME_AGENT_SELECTION_SURVIVED_REVOKE_AND_WAS_READOPTED_AFTER_REGRANT';
  }else if(staleAfterRevoke||staleAfterRegistryDrop||includesAfterRegrant>0){
    verdict='PARTIAL_STALE_FRAME_AGENT_STATE_OBSERVED';
  }

  const result={
    source,browserVersion,extensionId,workerReady,initialGrant,armed,positiveControlAttr,revoked,afterRevokeAttr,postCommand,afterRegistryDropAttr,regrant,final,includesAfterRegrant,removedEventCount:removedEvents.length,addedEventCount:finalAddedEvents.length,staleAfterRevoke,staleAfterRegistryDrop,preservedAcrossRegrant,verdict
  };
  assert(removedEvents.length>=1,JSON.stringify(result));
  assert(finalAddedEvents.length>=2,JSON.stringify(result));
  console.log('C46_PERMISSION_REVOKE_REGRANT_JSON='+JSON.stringify(result));
}finally{
  try{if(browser)await bounded(browser.close(),10000,'browser close')}catch{try{browser?.process()?.kill('SIGKILL')}catch{}}
  try{await new Promise(resolve=>s.server.close(resolve))}catch{}
  try{fs.rmSync(temp.root,{recursive:true,force:true})}catch{}
}
