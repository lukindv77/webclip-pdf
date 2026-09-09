'use strict';

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const chrome = process.env.CHROME_BIN;
if (!chrome || !fs.existsSync(chrome)) throw new Error('CHROME_BIN must point to Chrome for Testing');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function json(url, options) { const r = await fetch(url, options); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }

async function browserFixture() {
  function reqResult(req) { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  function txDone(tx) { return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error('tx aborted')); tx.onerror = () => {}; }); }
  function deleteDb(name) { return new Promise((resolve, reject) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('delete blocked')); }); }
  function openDb(name, version, upgrade, { closeOnVersionChange = true } = {}) {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(name, version);
      r.onupgradeneeded = e => { try { upgrade?.(r.result, r.transaction, e); } catch (err) { try { r.transaction.abort(); } catch (_) {} reject(err); } };
      r.onerror = () => reject(r.error);
      r.onsuccess = () => { const db = r.result; if (closeOnVersionChange) db.onversionchange = () => db.close(); resolve(db); };
      r.onblocked = () => reject(new Error('open blocked'));
    });
  }
  function createV7(db) {
    const entries = db.createObjectStore('entries', { keyPath: 'id' });
    entries.createIndex('createdAt', 'createdAt');
    db.createObjectStore('urlStats', { keyPath: 'urlKey' });
    db.createObjectStore('meta', { keyPath: 'key' });
    db.createObjectStore('pendingAppends', { keyPath: 'id' });
    db.createObjectStore('pendingDownloads', { keyPath: 'downloadId' });
    db.createObjectStore('pendingRemoteSaves', { keyPath: 'id' });
    db.createObjectStore('importStaging', { keyPath: 'key' });
  }
  function migrateV8(db, tx) {
    db.createObjectStore('journalFinalizations', { keyPath: 'finalizationId' });
    db.createObjectStore('pendingRemoteMutations', { keyPath: 'remoteEffectId' });
    db.createObjectStore('urlStatsV2', { keyPath: ['urlStatsGeneration', 'urlKey'] });
    db.createObjectStore('journalSummaries', { keyPath: 'entryId' });
    const meta = tx.objectStore('meta');
    meta.add({ key: 'datasetGeneration', value: 'jg-fixture' });
    meta.add({ key: 'authorityMode', value: 'passive-v8' });
  }
  const expectedV8 = ['entries','urlStats','meta','pendingAppends','pendingDownloads','pendingRemoteSaves','importStaging','journalFinalizations','pendingRemoteMutations','urlStatsV2','journalSummaries'].sort();
  const results = [];

  // 1: canonical migration.
  const a = 'j0-canonical'; await deleteDb(a).catch(()=>{});
  let db = await openDb(a, 7, createV7); db.close();
  db = await openDb(a, 8, migrateV8);
  results.push(['v7-v8-structural', db.version === 8 && JSON.stringify([...db.objectStoreNames].sort()) === JSON.stringify(expectedV8)]);
  let tx = db.transaction('meta', 'readonly'); const mode = await reqResult(tx.objectStore('meta').get('authorityMode')); const gen = await reqResult(tx.objectStore('meta').get('datasetGeneration')); await txDone(tx);
  results.push(['passive-meta', mode?.value === 'passive-v8' && gen?.value === 'jg-fixture']); db.close();

  // 2: old opener against v8 gets VersionError.
  let oldVersionError = false;
  try { await openDb(a, 7); } catch (e) { oldVersionError = e?.name === 'VersionError'; }
  results.push(['old-opener-versionerror', oldVersionError]);

  // 3: non-owner page tries v8, aborts onupgradeneeded, DB remains v7.
  const b = 'j0-page-abort'; await deleteDb(b).catch(()=>{});
  db = await openDb(b, 7, createV7); db.close();
  let pageAbort = false;
  try { await openDb(b, 8, (_db, tx2) => tx2.abort()); } catch (e) { pageAbort = e?.name === 'AbortError'; }
  const bCurrent = await new Promise((resolve, reject) => { const r = indexedDB.open(b); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
  results.push(['page-upgrade-abort-preserves-v7', pageAbort && bCurrent.version === 7 && !bCurrent.objectStoreNames.contains('journalFinalizations')]); bCurrent.close();

  // 4: cooperative old connection closes on versionchange, allowing owner migration.
  const c = 'j0-cooperative-close'; await deleteDb(c).catch(()=>{});
  const old = await openDb(c, 7, createV7, { closeOnVersionChange: true });
  const migrated = await openDb(c, 8, migrateV8);
  results.push(['versionchange-cooperative-close', migrated.version === 8 && migrated.objectStoreNames.contains('journalFinalizations')]); migrated.close(); try { old.close(); } catch (_) {}

  // 5: abort after structural mutation rolls back version + store.
  const d = 'j0-upgrade-rollback'; await deleteDb(d).catch(()=>{});
  db = await openDb(d, 7, createV7); db.close();
  let aborted = false;
  try { await openDb(d, 8, (db2, tx2) => { db2.createObjectStore('journalFinalizations', { keyPath: 'finalizationId' }); tx2.abort(); }); } catch (e) { aborted = e?.name === 'AbortError'; }
  const dCurrent = await new Promise((resolve, reject) => { const r = indexedDB.open(d); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
  results.push(['versionchange-rollback', aborted && dCurrent.version === 7 && !dCurrent.objectStoreNames.contains('journalFinalizations')]); dCurrent.close();

  // 6: after aborted page upgrade, worker owner can later migrate normally.
  const bOwner = await openDb(b, 8, migrateV8);
  results.push(['rebootstrap-owner-migrates', bOwner.version === 8 && bOwner.objectStoreNames.contains('journalSummaries')]); bOwner.close();

  // Cleanup.
  for (const name of [a,b,c,d]) await deleteDb(name).catch(()=>{});
  return results;
}

(async () => {
  const server = http.createServer((_req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end('<!doctype html><meta charset=utf-8><title>WebClip J0 fixture</title>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const debugPort = 9333;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-j0-chrome-'));
  const proc = spawn(chrome, ['--headless=new','--no-sandbox','--disable-gpu',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,`http://127.0.0.1:${port}/`], { stdio: ['ignore','pipe','pipe'] });
  let stderr = ''; proc.stderr.on('data', d => { stderr += d.toString(); });
  try {
    let pages;
    for (let i=0;i<80;i++) { try { pages = await json(`http://127.0.0.1:${debugPort}/json/list`); if (pages?.length) break; } catch (_) {} await sleep(100); }
    if (!pages?.length) throw new Error(`Chrome CDP did not start: ${stderr.slice(-2000)}`);
    const page = pages.find(p => p.type === 'page') || pages[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once:true }); ws.addEventListener('error', reject, { once:true }); });
    let id = 0; const pending = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const {resolve,reject}=pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } });
    const call = (method, params={}) => new Promise((resolve,reject) => { const callId=++id; pending.set(callId,{resolve,reject}); ws.send(JSON.stringify({id:callId,method,params})); });
    await call('Runtime.enable');
    const expression = `(${browserFixture.toString()})()`;
    const r = await call('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    const results = r.result.value;
    for (const [name, ok] of results) { if (!ok) throw new Error(`fixture failed: ${name}`); }
    console.log(`A0/U0/J0 Chrome IndexedDB fixture: PASS; cases=${results.length}`);
    for (const [name] of results) console.log(`PASS ${name}`);
    ws.close();
  } finally {
    proc.kill('SIGKILL');
    server.close();
    fs.rmSync(profile, { recursive:true, force:true });
  }
})().catch(err => { console.error(err); process.exit(1); });
