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
const FRAME_AGENT = fs.readFileSync(path.join(ROOT, 'frame-agent.js'), 'utf8');
const CHILD_PATTERN = 'http://127.0.0.2/*';
const TOP_PATTERN = 'http://127.0.0.1/*';
const SEED_VERSION = '0.9.7';

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
  return {
    manifestVersion: MANIFEST.version,
    optionalHttpHost: true,
    productionPermissionsOnRemovedListener: false
  };
}

async function startServer() {
  const events = [];
  const gates = new Map();
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/top') {
      const body = `<!doctype html><meta charset="utf-8"><title>C46 permission top</title><h1>TOP</h1><iframe id="child" src="http://127.0.0.2:${server.address().port}/child" style="width:700px;height:400px"></iframe>`;
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(body)});
      res.end(body);
      return;
    }
    if (u.pathname === '/child') {
      const body = '<!doctype html><meta charset="utf-8"><title>C46 permission child</title><style>body{font:18px sans-serif;padding:20px}.target{display:block;width:260px;height:60px;margin:18px;padding:12px;border:2px solid #333}</style><div id="target0" class="target">POSITIVE_CONTROL</div><div id="target1" class="target">AFTER_REVOKE</div><div id="target2" class="target">AFTER_WORKER_DROP</div>';
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(body)});
      res.end(body);
      return;
    }
    if (u.pathname === '/event') {
      try {
        const kind = String(u.searchParams.get('kind') || 'unknown');
        const data = JSON.parse(u.searchParams.get('data') || '{}');
        events.push({ kind, data, receivedAt: Date.now() });
        res.writeHead(200); res.end('ok');
      } catch (error) {
        res.writeHead(400); res.end(String(error?.message || error));
      }
      return;
    }
    if (u.pathname === '/gate') {
      const name = String(u.searchParams.get('name') || '');
      res.writeHead(gates.get(name) ? 200 : 425, {'content-type':'application/json'});
      res.end(JSON.stringify({ok:Boolean(gates.get(name)), at:Number(gates.get(name) || 0)}));
      return;
    }
    res.writeHead(404); res.end('not found');
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
        await sleep(100);
      }
      throw new Error(`Timed out waiting for event ${kind}`);
    }
  };
}

function copyExtension() {
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
  fs.writeFileSync(path.join(ext, 'probe.html'), '<!doctype html><meta charset="utf-8"><title>C46 permission probe</title><button id="grant">Grant child host</button><output id="out"></output><script src="probe.js"></script>\n');
  fs.writeFileSync(path.join(ext, 'probe.js'), `const PATTERN=${JSON.stringify(CHILD_PATTERN)};\nconst out=document.getElementById('out');\ndocument.getElementById('grant').addEventListener('click',async()=>{\n  document.body.dataset.requestStarted=String(Date.now());\n  try{\n    const granted=await chrome.permissions.request({origins:[PATTERN]});\n    document.body.dataset.requestSettled=String(Date.now());\n    document.body.dataset.granted=String(Boolean(granted));\n    out.textContent='granted='+Boolean(granted);\n  }catch(error){\n    document.body.dataset.requestSettled=String(Date.now());\n    document.body.dataset.granted='error';\n    document.body.dataset.error=String(error?.message||error);\n    out.textContent='error';\n  }\n});\n`);
  return { root, ext, profile };
}

function writeSeedManifest(ext) {
  const manifest = structuredClone(MANIFEST);
  manifest.version = SEED_VERSION;
  manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), TOP_PATTERN, CHILD_PATTERN])];
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function writeProductionHarness(ext, s) {
  const manifest = structuredClone(MANIFEST);
  manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), TOP_PATTERN])].filter((item) => item !== CHILD_PATTERN);
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  fs.copyFileSync(path.join(ROOT, 'service-worker.js'), path.join(ext, 'service-worker.js'));
  const sidecar = `\n(async()=>{\nconst CHILD_PATTERN=${JSON.stringify(CHILD_PATTERN)};\nconst TOP_URL=${JSON.stringify(s.topUrl)};\nconst EVENT_URL=${JSON.stringify(s.eventUrl)};\nconst GATE_URL=${JSON.stringify(s.gateUrl)};\nconst sleep=ms=>new Promise(r=>setTimeout(r,ms));\nconst permissionEvents=[];\ntry{chrome.permissions.onAdded.addListener(p=>permissionEvents.push({kind:'added',permissions:p,at:Date.now()}));}catch{}\ntry{chrome.permissions.onRemoved.addListener(p=>permissionEvents.push({kind:'removed',permissions:p,at:Date.now()}));}catch{}\nconst emit=(kind,data)=>fetch(EVENT_URL+'?kind='+encodeURIComponent(kind)+'&data='+encodeURIComponent(JSON.stringify(data))).catch(()=>{});\nconst waitTab=async id=>{for(let i=0;i<240;i++){try{const t=await chrome.tabs.get(id);if(t.status==='complete')return t}catch{}await sleep(100)}throw new Error('tab load timeout')};\nconst hasPermission=()=>chrome.permissions.contains({origins:[CHILD_PATTERN]}).catch(()=>false);\nconst waitPermission=async expected=>{for(let i=0;i<600;i++){if(Boolean(await hasPermission())===Boolean(expected))return true;await sleep(100)}throw new Error('permission state timeout '+expected)};\nconst waitGate=async name=>{for(let i=0;i<600;i++){try{const r=await fetch(GATE_URL+'?name='+encodeURIComponent(name),{cache:'no-store'});if(r.ok)return await r.json()}catch{}await sleep(100)}throw new Error('gate timeout '+name)};\ntry{\n  const top=await chrome.tabs.create({url:TOP_URL,active:false});\n  await waitTab(top.id);\n  await emit('ready',{topTabId:top.id,permissionInitially:await hasPermission(),registryInitially:listRegisteredFrameAgents(top.id).length,manifestVersion:chrome.runtime.getManifest().version,permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('initial-normalized');\n  await waitPermission(true);\n  const enableInitial=await enableFrameAgentsForTab(top.id);\n  let records=[];\n  for(let i=0;i<100;i++){records=listRegisteredFrameAgents(top.id);if(records.length)break;await sleep(100)}\n  if(!records.length)throw new Error('frame agent did not register after grant');\n  const frameId=Number(records[0].frameId);\n  const startResult=await sendFrameAgentCommand(top.id,frameId,'start',{mode:'include'});\n  const startState=await sendFrameAgentCommand(top.id,frameId,'get-state');\n  await emit('armed',{topTabId:top.id,frameId,enableInitial,records,startResult,startState,permissionAfterGrant:await hasPermission(),permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitPermission(false);\n  const registryAfterRevoke=listRegisteredFrameAgents(top.id);\n  await emit('revoked',{permissionAfterRevoke:await hasPermission(),registryAfterRevoke,permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('clicked1');\n  let commandError=''; let commandResult=null;\n  try{commandResult=await sendFrameAgentCommand(top.id,frameId,'get-state')}catch(e){commandError=String(e?.message||e)}\n  const registryAfterCommand=listRegisteredFrameAgents(top.id);\n  await emit('post-command',{commandResult,commandError,registryAfterCommand,permissionEvents:[...permissionEvents],at:Date.now()});\n  await waitGate('clicked2');\n  await waitPermission(true);\n  const enableAfterRegrant=await enableFrameAgentsForTab(top.id);\n  let reRecords=[];\n  for(let i=0;i<100;i++){reRecords=listRegisteredFrameAgents(top.id);if(reRecords.length)break;await sleep(100)}\n  if(!reRecords.length)throw new Error('frame agent did not register after regrant');\n  const reFrameId=Number(reRecords[0].frameId);\n  const stateAfterRegrant=await sendFrameAgentCommand(top.id,reFrameId,'get-state');\n  let cleanup=null; try{cleanup=await sendFrameAgentCommand(top.id,reFrameId,'stop',{clear:true})}catch(e){cleanup={error:String(e?.message||e)}}\n  await emit('final',{permissionAfterRegrant:await hasPermission(),enableAfterRegrant,reRecords,stateAfterRegrant,cleanup,permissionEvents:[...permissionEvents],at:Date.now()});\n}catch(e){await emit('fatal',{error:String(e?.stack||e),permissionEvents:[...permissionEvents],at:Date.now()});}\n})();\n`;
  fs.appendFileSync(path.join(ext, 'service-worker.js'), sidecar);
}

async function launchExtension(ext, profile) {
  return puppeteer.launch({
    headless: false,
    pipe: false,
    userDataDir: profile,
    enableExtensions: [ext],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']
  });
}

async function waitWorker(browser) {
  return browser.waitForTarget(
    (target) => target.type() === 'service_worker' && target.url().endsWith('/service-worker.js'),
    { timeout: 30000 }
  );
}

async function openProbe(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/probe.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return page;
}

async function containsPermission(probe) {
  return probe.evaluate((pattern) => chrome.permissions.contains({ origins: [pattern] }), CHILD_PATTERN);
}

async function requestPermissionTrusted(probe, timeoutMs = 10000) {
  await probe.evaluate(() => {
    document.body.dataset.requestStarted = '';
    document.body.dataset.requestSettled = '';
    document.body.dataset.granted = '';
    document.body.dataset.error = '';
  });
  await probe.click('#grant');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await probe.evaluate(() => ({
      started: document.body.dataset.requestStarted || '',
      settled: document.body.dataset.requestSettled || '',
      granted: document.body.dataset.granted || '',
      error: document.body.dataset.error || ''
    }));
    if (state.settled) return state;
    await sleep(100);
  }
  throw new Error('Trusted chrome.permissions.request did not settle; native prompt may still be open');
}

async function waitPermissionState(probe, expected, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (Boolean(await containsPermission(probe)) === Boolean(expected)) return true;
    await sleep(100);
  }
  throw new Error(`Permission did not become ${expected}`);
}

async function waitForChildFrame(page, childUrl) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item.url() === childUrl);
    if (frame) return frame;
    await sleep(100);
  }
  throw new Error(`Child frame not found: ${childUrl}`);
}

async function openManager(browser) {
  const manager = await browser.newPage();
  await manager.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const shape = await manager.evaluate(() => ({
    present: Boolean(globalThis.chrome?.developerPrivate),
    add: typeof globalThis.chrome?.developerPrivate?.addHostPermission,
    remove: typeof globalThis.chrome?.developerPrivate?.removeHostPermission
  }));
  assert.equal(shape.present, true, JSON.stringify(shape));
  assert.equal(shape.add, 'function', JSON.stringify(shape));
  assert.equal(shape.remove, 'function', JSON.stringify(shape));
  return { manager, shape };
}

async function hostPermission(managerPage, method, extensionId, pattern) {
  return managerPage.evaluate(async ({ method, extensionId, pattern }) => {
    const api = globalThis.chrome?.developerPrivate;
    if (!api || typeof api[method] !== 'function') {
      throw new Error(`chrome.developerPrivate.${method} unavailable`);
    }
    await api[method](extensionId, pattern);
    return true;
  }, { method, extensionId, pattern });
}

const source = sourceChecks();
const s = await startServer();
const temp = copyExtension();
let browser = null;
try {
  writeSeedManifest(temp.ext);
  browser = await launchExtension(temp.ext, temp.profile);
  let workerTarget = await waitWorker(browser);
  const seedExtensionId = new URL(workerTarget.url()).host;
  const seedProbe = await openProbe(browser, seedExtensionId);
  const seedManifestVersion = await seedProbe.evaluate(() => chrome.runtime.getManifest().version);
  const seedPermission = await containsPermission(seedProbe);
  assert.equal(seedManifestVersion, SEED_VERSION);
  assert.equal(seedPermission, true, 'Seed required child host was not active');
  await browser.close();
  browser = null;

  writeProductionHarness(temp.ext, s);
  browser = await launchExtension(temp.ext, temp.profile);
  workerTarget = await waitWorker(browser);
  const extensionId = new URL(workerTarget.url()).host;
  const browserVersion = await browser.version();
  assert.equal(extensionId, seedExtensionId, 'Extension id changed across seeded relaunch');

  const ready = await Promise.race([
    s.waitEvent('ready', 30000),
    s.waitEvent('fatal', 30000).then((x) => { throw new Error(JSON.stringify(x)); })
  ]);
  assert.equal(ready.manifestVersion, MANIFEST.version, JSON.stringify(ready));

  const probe = await openProbe(browser, extensionId);
  const { manager, shape: developerPrivateShape } = await openManager(browser);
  const permissionAtProductionLaunch = await containsPermission(probe);
  if (permissionAtProductionLaunch) {
    await hostPermission(manager, 'removeHostPermission', extensionId, CHILD_PATTERN);
    await waitPermissionState(probe, false);
  }
  const permissionBeforeTrustedRequest = await containsPermission(probe);
  assert.equal(permissionBeforeTrustedRequest, false);
  s.setGate('initial-normalized');

  const firstRequest = await requestPermissionTrusted(probe);
  assert.equal(firstRequest.granted, 'true', JSON.stringify(firstRequest));
  await waitPermissionState(probe, true);

  const armed = await Promise.race([
    s.waitEvent('armed', 30000),
    s.waitEvent('fatal', 30000).then((x) => { throw new Error(JSON.stringify(x)); })
  ]);
  assert.equal(armed.permissionAfterGrant, true, JSON.stringify(armed));
  assert(Number(armed.frameId) > 0, JSON.stringify(armed));
  assert.equal(armed.startState?.phase, 'selecting', JSON.stringify(armed));

  const topTarget = await browser.waitForTarget((target) => target.url() === s.topUrl, { timeout: 20000 });
  const topPage = await topTarget.page();
  assert(topPage, 'top page target has no page');
  const child = await waitForChildFrame(topPage, s.childUrl);

  await child.click('#target0');
  await sleep(200);
  const positiveControlAttr = await child.$eval('#target0', (el) => el.getAttribute('data-webclip-remote-include'));
  assert(positiveControlAttr, 'Positive-control click was not handled by frame-agent');

  await hostPermission(manager, 'removeHostPermission', extensionId, CHILD_PATTERN);
  await waitPermissionState(probe, false);
  const revoked = await Promise.race([
    s.waitEvent('revoked', 30000),
    s.waitEvent('fatal', 30000).then((x) => { throw new Error(JSON.stringify(x)); })
  ]);
  assert.equal(revoked.permissionAfterRevoke, false, JSON.stringify(revoked));

  await child.click('#target1');
  await sleep(200);
  const afterRevokeAttr = await child.$eval('#target1', (el) => el.getAttribute('data-webclip-remote-include'));
  s.setGate('clicked1');

  const postCommand = await Promise.race([
    s.waitEvent('post-command', 30000),
    s.waitEvent('fatal', 30000).then((x) => { throw new Error(JSON.stringify(x)); })
  ]);
  assert.match(String(postCommand.commandError || ''), /permission|Host permission|отозван/i, JSON.stringify(postCommand));
  assert.equal(Array.isArray(postCommand.registryAfterCommand) ? postCommand.registryAfterCommand.length : -1, 0, JSON.stringify(postCommand));

  await child.click('#target2');
  await sleep(200);
  const afterRegistryDropAttr = await child.$eval('#target2', (el) => el.getAttribute('data-webclip-remote-include'));
  s.setGate('clicked2');

  const secondRequest = await requestPermissionTrusted(probe);
  assert.equal(secondRequest.granted, 'true', JSON.stringify(secondRequest));
  await waitPermissionState(probe, true);

  const final = await Promise.race([
    s.waitEvent('final', 30000),
    s.waitEvent('fatal', 30000).then((x) => { throw new Error(JSON.stringify(x)); })
  ]);
  assert.equal(final.permissionAfterRegrant, true, JSON.stringify(final));

  const includesAfterRegrant = Array.isArray(final?.stateAfterRegrant?.snapshot?.includes)
    ? final.stateAfterRegrant.snapshot.includes.length
    : -1;
  const staleAfterRevoke = Boolean(afterRevokeAttr);
  const staleAfterRegistryDrop = Boolean(afterRegistryDropAttr);
  const preservedAcrossRegrant = includesAfterRegrant >= 3 && final?.stateAfterRegrant?.phase === 'selecting';
  const actualRevokeRemovedEvent = (revoked.permissionEvents || []).some((event) => event?.kind === 'removed');
  const regrantAddedEvent = (final.permissionEvents || []).filter((event) => event?.kind === 'added').length >= 2;

  let verdict = 'NO_STALE_FRAME_AGENT_ACTIVITY_OBSERVED';
  if (staleAfterRevoke && staleAfterRegistryDrop && preservedAcrossRegrant) {
    verdict = 'STALE_FRAME_AGENT_SELECTION_SURVIVED_REVOKE_AND_WAS_READOPTED_AFTER_REGRANT';
  } else if (staleAfterRevoke || staleAfterRegistryDrop || includesAfterRegrant > 0) {
    verdict = 'PARTIAL_STALE_FRAME_AGENT_STATE_OBSERVED';
  }

  const result = {
    source,
    browserVersion,
    seed: {
      seedManifestVersion,
      seedExtensionId,
      seedPermission
    },
    extensionId,
    developerPrivateShape,
    ready,
    permissionAtProductionLaunch,
    permissionBeforeTrustedRequest,
    firstRequest,
    armed,
    positiveControlAttr,
    revoked,
    afterRevokeAttr,
    postCommand,
    afterRegistryDropAttr,
    secondRequest,
    final,
    includesAfterRegrant,
    staleAfterRevoke,
    staleAfterRegistryDrop,
    preservedAcrossRegrant,
    actualRevokeRemovedEvent,
    regrantAddedEvent,
    verdict
  };

  assert.equal(Array.isArray(revoked.registryAfterRevoke) ? revoked.registryAfterRevoke.length : -1, 1, JSON.stringify(result));
  assert.equal(actualRevokeRemovedEvent, true, JSON.stringify(result));
  assert.equal(regrantAddedEvent, true, JSON.stringify(result));
  console.log('C46_PERMISSION_REVOKE_REGRANT_JSON=' + JSON.stringify(result));
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { await new Promise((resolve) => s.server.close(resolve)); } catch {}
  try { fs.rmSync(temp.root, { recursive: true, force: true }); } catch {}
}
