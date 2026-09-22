'use strict';

// P1-164 live Chrome runtime-source attestor.
// Loopback DevTools only. Reads the already-running MV3 service worker and
// chrome-extension:// package resources. No Yandex/OAuth/provider mutation surface.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const packageAuthority = require('./release_package_authority.js');
const releaseIdentity = require('./release_identity.js');

const ROOT = path.resolve(__dirname, '..');
const ATTESTATION_SCHEMA = 'webclip-p1-164-runtime-source-attestation/v1';
const CONTRACT_SCHEMA = 'webclip-p1-164-runtime-source-contract/v1';
const EVIDENCE_CLASS = 'live-browser-runtime-source-attestation-only';
const MAX_CDP_MESSAGE_BYTES = 32 * 1024 * 1024;
const CDP_TIMEOUT_MS = 10000;
const SCRIPT_EVENT_WAIT_MS = 250;
const LIMITATIONS = Object.freeze([
  'does-not-prove-yandex-command-executed',
  'does-not-prove-provider-mutation-causality',
  'does-not-authenticate-provider-observation-origin',
  'does-not-close-p1-164',
  'does-not-advance-yandex-qcf',
  'does-not-authorize-release'
]);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}
function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function sha256Label(label, value) {
  return 'sha256:' + sha256Hex(Buffer.concat([
    Buffer.from(String(label), 'utf8'),
    Buffer.from([0]),
    Buffer.from(String(value), 'utf8')
  ]));
}
function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const wrapped = new Error('git command failed');
    wrapped.code = 'RUNTIME_ATTESTATION_GIT_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}
function exactHeadClean() {
  const head = String(git(['rev-parse', 'HEAD'])).trim();
  if (!/^[0-9a-f]{40}$/.test(head)) fail('RUNTIME_ATTESTATION_HEAD_INVALID');
  if (String(git(['status', '--porcelain', '--untracked-files=no'])).trim()) {
    fail('RUNTIME_ATTESTATION_TRACKED_WORKTREE_DIRTY');
  }
  return head;
}

function parseStaticImportScripts(sourceText) {
  const source = String(sourceText || '');
  const tokens = [...source.matchAll(/\bimportScripts\s*\(/g)];
  const calls = [...source.matchAll(/\bimportScripts\s*\(([^)]*)\)\s*;/g)];
  if (tokens.length !== calls.length) fail('RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED');
  const out = [];
  for (const call of calls) {
    const args = call[1];
    let index = 0;
    while (index < args.length) {
      while (index < args.length && /\s/.test(args[index])) index += 1;
      const quote = args[index];
      if (quote !== "'" && quote !== '"') fail('RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED');
      index += 1;
      let value = '';
      while (index < args.length && args[index] !== quote) {
        if (args[index] === '\\') fail('RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED');
        value += args[index++];
      }
      if (args[index] !== quote) fail('RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED');
      index += 1;
      while (index < args.length && /\s/.test(args[index])) index += 1;
      if (index < args.length) {
        if (args[index] !== ',') fail('RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED');
        index += 1;
      }
      const rel = packageAuthority.validatePath(value);
      if (!rel.endsWith('.js')) fail('RUNTIME_ATTESTATION_IMPORT_NOT_JS', rel);
      out.push(rel);
    }
  }
  return Object.freeze(out);
}

function deriveWorkerScriptPaths(packageInputs, serviceWorkerPath) {
  const members = new Map(packageInputs.members.map((item) => [item.path, item.bytes]));
  const visited = new Set();
  const queue = [serviceWorkerPath];
  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    const bytes = members.get(rel);
    if (!bytes) fail('RUNTIME_ATTESTATION_WORKER_SCRIPT_MISSING', rel);
    let source;
    try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch (_) { fail('RUNTIME_ATTESTATION_WORKER_SCRIPT_UTF8_INVALID', rel); }
    visited.add(rel);
    for (const imported of parseStaticImportScripts(source)) {
      if (!members.has(imported)) fail('RUNTIME_ATTESTATION_IMPORTED_SCRIPT_NOT_PACKAGE_MEMBER', imported);
      if (!visited.has(imported)) queue.push(imported);
    }
  }
  return Object.freeze([...visited]);
}

function expectedRuntimeContract(candidateSha) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const packageManifest = packageAuthority.readCanonicalManifest();
  const packageInputs = packageAuthority.identityInputs(candidate, packageManifest);
  const identities = releaseIdentity.computeIdentities(candidate);
  const manifestMember = packageInputs.members.find((item) => item.path === 'manifest.json');
  if (!manifestMember) fail('RUNTIME_ATTESTATION_MANIFEST_MISSING');
  let manifest;
  try { manifest = JSON.parse(manifestMember.bytes.toString('utf8')); }
  catch (_) { fail('RUNTIME_ATTESTATION_MANIFEST_INVALID'); }
  const serviceWorkerPath = String(manifest && manifest.background && manifest.background.service_worker || '');
  if (!serviceWorkerPath || !packageManifest.files.includes(serviceWorkerPath)) {
    fail('RUNTIME_ATTESTATION_SERVICE_WORKER_INVALID');
  }
  const scripts = deriveWorkerScriptPaths(packageInputs, serviceWorkerPath);
  return Object.freeze({
    schema: CONTRACT_SCHEMA,
    testedSourceSha: candidate,
    subject: Object.freeze({
      rpf: identities.rpf,
      yandexQcf: identities.qcf['yandex-e2e']
    }),
    packageSchema: packageInputs.package_schema,
    pathProfile: packageInputs.path_profile,
    packageMembers: Object.freeze(packageInputs.members.map((item) => Object.freeze({
      path: item.path,
      byteLength: item.bytes.length,
      sha256: sha256Hex(item.bytes)
    }))),
    manifest: Object.freeze({
      manifestVersion: Number(manifest.manifest_version),
      name: String(manifest.name || ''),
      version: String(manifest.version || ''),
      minimumChromeVersion: String(manifest.minimum_chrome_version || ''),
      serviceWorkerPath: serviceWorkerPath
    }),
    loadedWorkerScripts: Object.freeze(scripts.map((rel) => {
      const item = packageInputs.members.find((member) => member.path === rel);
      return Object.freeze({ path: rel, sha256: sha256Hex(item.bytes) });
    }))
  });
}

function extensionTarget(urlValue, serviceWorkerPath) {
  let url;
  try { url = new URL(String(urlValue || '')); } catch (_) { return null; }
  if (url.protocol !== 'chrome-extension:') return null;
  if (!/^[a-p]{32}$/.test(url.hostname)) return null;
  if (url.pathname !== '/' + serviceWorkerPath) return null;
  return Object.freeze({ extensionId: url.hostname, url: url.href });
}

function validateRuntimeSnapshot(contract, snapshot) {
  if (!contract || contract.schema !== CONTRACT_SCHEMA) fail('RUNTIME_ATTESTATION_CONTRACT_INVALID');
  if (!snapshot || typeof snapshot !== 'object') fail('RUNTIME_ATTESTATION_SNAPSHOT_INVALID');
  const target = extensionTarget(snapshot.serviceWorkerUrl, contract.manifest.serviceWorkerPath);
  if (!target) fail('RUNTIME_ATTESTATION_SERVICE_WORKER_TARGET_INVALID');
  if (snapshot.extensionId !== target.extensionId) fail('RUNTIME_ATTESTATION_EXTENSION_ID_MISMATCH');

  const manifest = snapshot.manifest;
  if (!manifest
    || Number(manifest.manifest_version) !== contract.manifest.manifestVersion
    || String(manifest.name || '') !== contract.manifest.name
    || String(manifest.version || '') !== contract.manifest.version
    || String(manifest.minimum_chrome_version || '') !== contract.manifest.minimumChromeVersion
    || String(manifest.background && manifest.background.service_worker || '') !== contract.manifest.serviceWorkerPath) {
    fail('RUNTIME_ATTESTATION_MANIFEST_MISMATCH');
  }
  if (snapshot.browserRpf !== contract.subject.rpf) fail('RUNTIME_ATTESTATION_RPF_MISMATCH');

  if (!Array.isArray(snapshot.members) || snapshot.members.length !== contract.packageMembers.length) {
    fail('RUNTIME_ATTESTATION_MEMBER_SET_MISMATCH');
  }
  const expectedMembers = new Map(contract.packageMembers.map((item) => [item.path, item]));
  const seenMembers = new Set();
  for (const item of snapshot.members) {
    const expected = expectedMembers.get(item && item.path);
    if (!expected || seenMembers.has(item.path)) fail('RUNTIME_ATTESTATION_MEMBER_SET_MISMATCH');
    seenMembers.add(item.path);
    if (Number(item.byteLength) !== expected.byteLength || String(item.sha256 || '') !== expected.sha256) {
      fail('RUNTIME_ATTESTATION_MEMBER_DIGEST_MISMATCH', item.path);
    }
  }

  if (!Array.isArray(snapshot.loadedScripts)) fail('RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH');
  const expectedScripts = new Map(contract.loadedWorkerScripts.map((item) => [item.path, item]));
  const seenScripts = new Set();
  for (const item of snapshot.loadedScripts) {
    if (!item || typeof item.path !== 'string' || seenScripts.has(item.path)) {
      fail('RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH');
    }
    seenScripts.add(item.path);
    const expected = expectedScripts.get(item.path);
    if (!expected) fail('RUNTIME_ATTESTATION_UNEXPECTED_LOADED_SCRIPT', item.path);
    if (String(item.sha256 || '') !== expected.sha256) {
      fail('RUNTIME_ATTESTATION_LOADED_SCRIPT_DIGEST_MISMATCH', item.path);
    }
  }
  if (seenScripts.size !== expectedScripts.size) fail('RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH');
  for (const rel of expectedScripts.keys()) {
    if (!seenScripts.has(rel)) fail('RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH', rel);
  }

  return Object.freeze({
    extensionId: target.extensionId,
    packageMemberCount: seenMembers.size,
    loadedScriptCount: seenScripts.size,
    matchesExpected: true
  });
}

function finalizeLiveAttestation(contract, snapshot, browserVersion) {
  const valid = validateRuntimeSnapshot(contract, snapshot);
  return Object.freeze({
    schema: ATTESTATION_SCHEMA,
    generatedAt: new Date().toISOString(),
    evidenceClass: EVIDENCE_CLASS,
    testedSourceSha: contract.testedSourceSha,
    subject: contract.subject,
    browser: Object.freeze({
      product: String(browserVersion || '').slice(0, 120),
      targetType: 'service_worker',
      extensionIdDigest: sha256Label('WEBCLIP_P1_164_EXTENSION_ID_V1', valid.extensionId)
    }),
    package: Object.freeze({
      memberCount: valid.packageMemberCount,
      browserRpf: snapshot.browserRpf,
      exactMemberDigestsMatch: true
    }),
    runningWorker: Object.freeze({
      serviceWorkerPath: contract.manifest.serviceWorkerPath,
      loadedScriptCount: valid.loadedScriptCount,
      parsedSourceDigestsMatch: true
    }),
    runningExtensionSourceProven: true,
    providerMutationCausalityProven: false,
    commandExecutionProven: false,
    qualificationPass: false,
    releaseAuthorized: false,
    limitations: LIMITATIONS
  });
}

function buildPackageProbeExpression(contract) {
  const filesJson = JSON.stringify(contract.packageMembers.map((item) => item.path));
  const schemaJson = JSON.stringify(contract.packageSchema);
  const profileJson = JSON.stringify(contract.pathProfile);
  return "(async()=>{const files=" + filesJson + ";const packageSchema=" + schemaJson + ";const pathProfile=" + profileJson + ";"
    + "const te=new TextEncoder();const cat=(xs)=>{let n=0;for(const x of xs)n+=x.length;const o=new Uint8Array(n);let p=0;for(const x of xs){o.set(x,p);p+=x.length;}return o;};"
    + "const u32=(n)=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,false);return b;};"
    + "const u64=(n)=>{const b=new Uint8Array(8);new DataView(b.buffer).setBigUint64(0,BigInt(n),false);return b;};"
    + "const tag=(t,...xs)=>cat([new Uint8Array([t]),...xs]);"
    + "const txt=(s)=>{const b=te.encode(s);return tag(1,u32(b.length),b);};"
    + "const enc=(v)=>{if(typeof v==='string')return txt(v);if(v instanceof Uint8Array)return tag(2,u64(v.length),v);if(Number.isSafeInteger(v)&&v>=0)return tag(3,u64(v));if(Array.isArray(v))return tag(4,u32(v.length),...v.map(enc));if(v&&typeof v==='object'){const ks=Object.keys(v).sort((a,b)=>{const x=te.encode(a),y=te.encode(b);for(let i=0;i<Math.min(x.length,y.length);i++){if(x[i]!==y[i])return x[i]-y[i];}return x.length-y.length;});return tag(5,u32(ks.length),...ks.flatMap(k=>[txt(k),enc(v[k])]));}throw new Error('unsupported');};"
    + "const hex=async(b)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');"
    + "const members=[];const raw=[];for(const p of files){const r=await fetch(chrome.runtime.getURL(p),{cache:'no-store'});if(!r.ok)throw new Error('fetch:'+p+':'+r.status);const b=new Uint8Array(await r.arrayBuffer());members.push({path:p,byteLength:b.length,sha256:await hex(b)});raw.push({path:p,bytes:b});}"
    + "const payload={package_schema:packageSchema,path_profile:pathProfile,members:raw};const pre=cat([txt('WEBCLIP_RELEASE_IDENTITY_V1'),txt('RPF_V1'),enc(payload)]);"
    + "return {extensionId:chrome.runtime.id,manifest:chrome.runtime.getManifest(),serviceWorkerUrl:self.location.href,members,browserRpf:'sha256:'+await hex(pre)};})()";
}

function assertLoopbackBase(rawValue) {
  let url;
  try { url = new URL(String(rawValue || '')); } catch (_) { fail('RUNTIME_ATTESTATION_CDP_URL_INVALID'); }
  if (url.protocol !== 'http:' || url.username || url.password || url.search || url.hash) {
    fail('RUNTIME_ATTESTATION_CDP_URL_INVALID');
  }
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)) {
    fail('RUNTIME_ATTESTATION_CDP_NOT_LOOPBACK');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url;
}
function assertLoopbackWebSocket(rawValue) {
  let url;
  try { url = new URL(String(rawValue || '')); } catch (_) { fail('RUNTIME_ATTESTATION_CDP_WEBSOCKET_INVALID'); }
  if (url.protocol !== 'ws:' || url.username || url.password) fail('RUNTIME_ATTESTATION_CDP_WEBSOCKET_INVALID');
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)) {
    fail('RUNTIME_ATTESTATION_CDP_NOT_LOOPBACK');
  }
  return url.href;
}

async function fetchJson(url, timeoutMs = CDP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'error', signal: controller.signal });
    if (!response.ok) fail('RUNTIME_ATTESTATION_CDP_HTTP_FAILED', response.status);
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_CDP_MESSAGE_BYTES) fail('RUNTIME_ATTESTATION_CDP_MESSAGE_TOO_LARGE');
    return JSON.parse(text);
  } catch (error) {
    if (error && error.code) throw error;
    fail('RUNTIME_ATTESTATION_CDP_HTTP_FAILED');
  } finally {
    clearTimeout(timer);
  }
}

class CdpClient {
  constructor(webSocketUrl) {
    if (typeof WebSocket !== 'function') fail('RUNTIME_ATTESTATION_WEBSOCKET_UNAVAILABLE');
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'RUNTIME_ATTESTATION_CDP_TIMEOUT' })), CDP_TIMEOUT_MS);
      this.socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.socket.addEventListener('error', () => { clearTimeout(timer); reject(Object.assign(new Error('websocket'), { code: 'RUNTIME_ATTESTATION_CDP_WEBSOCKET_FAILED' })); }, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const text = typeof event.data === 'string' ? event.data : '';
      if (Buffer.byteLength(text, 'utf8') > MAX_CDP_MESSAGE_BYTES) return;
      let message;
      try { message = JSON.parse(text); } catch (_) { return; }
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(Object.assign(new Error(String(message.error.message || 'cdp error')), { code: 'RUNTIME_ATTESTATION_CDP_COMMAND_FAILED' }));
        else pending.resolve(message.result || {});
        return;
      }
      if (message.method) this.events.push(message);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Object.assign(new Error('timeout'), { code: 'RUNTIME_ATTESTATION_CDP_TIMEOUT' }));
      }, CDP_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.socket.close(); } catch (_) {}
  }
}

function resultValue(result) {
  if (result && result.exceptionDetails) fail('RUNTIME_ATTESTATION_RUNTIME_EVALUATION_FAILED');
  const remote = result && result.result;
  if (!remote || !Object.prototype.hasOwnProperty.call(remote, 'value')) {
    fail('RUNTIME_ATTESTATION_RUNTIME_EVALUATION_FAILED');
  }
  return remote.value;
}
function parsedPath(urlValue, extensionId) {
  let url;
  try { url = new URL(String(urlValue || '')); } catch (_) { return ''; }
  if (url.protocol !== 'chrome-extension:' || url.hostname !== extensionId) return '';
  const rel = url.pathname.replace(/^\/+/, '');
  try { return packageAuthority.validatePath(rel); } catch (_) { return ''; }
}

async function collectScriptSnapshot(client, extensionId, contract) {
  await client.send('Debugger.enable');
  await new Promise((resolve) => setTimeout(resolve, SCRIPT_EVENT_WAIT_MS));
  const byPath = new Map();
  for (const event of client.events.filter((item) => item.method === 'Debugger.scriptParsed')) {
    const rel = parsedPath(event.params && event.params.url, extensionId);
    if (!rel) continue;
    if (!byPath.has(rel)) byPath.set(rel, []);
    byPath.get(rel).push(String(event.params && event.params.scriptId || ''));
  }
  const expected = new Set(contract.loadedWorkerScripts.map((item) => item.path));
  for (const rel of byPath.keys()) {
    if (!expected.has(rel)) fail('RUNTIME_ATTESTATION_UNEXPECTED_LOADED_SCRIPT', rel);
  }
  const out = [];
  for (const item of contract.loadedWorkerScripts) {
    const ids = (byPath.get(item.path) || []).filter(Boolean);
    if (ids.length !== 1) fail('RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH', item.path);
    const source = await client.send('Debugger.getScriptSource', { scriptId: ids[0] });
    if (typeof source.scriptSource !== 'string') fail('RUNTIME_ATTESTATION_SCRIPT_SOURCE_INVALID', item.path);
    out.push(Object.freeze({ path: item.path, sha256: sha256Hex(Buffer.from(source.scriptSource, 'utf8')) }));
  }
  return Object.freeze(out);
}
function manifestLooksLikeContract(manifest, contract) {
  return !!manifest
    && Number(manifest.manifest_version) === contract.manifest.manifestVersion
    && String(manifest.name || '') === contract.manifest.name
    && String(manifest.version || '') === contract.manifest.version
    && String(manifest.background && manifest.background.service_worker || '') === contract.manifest.serviceWorkerPath;
}

async function collectLiveSnapshot(contract, cdpBase) {
  const base = assertLoopbackBase(cdpBase);
  const versionUrl = new URL(base.href);
  versionUrl.pathname = base.pathname + '/json/version';
  const listUrl = new URL(base.href);
  listUrl.pathname = base.pathname + '/json/list';
  const version = await fetchJson(versionUrl.href);
  const targets = await fetchJson(listUrl.href);
  if (!Array.isArray(targets)) fail('RUNTIME_ATTESTATION_CDP_TARGET_LIST_INVALID');

  const matches = [];
  const matchingFailures = [];
  for (const target of targets) {
    if (String(target && target.type || '') !== 'service_worker') continue;
    if (!extensionTarget(target.url, contract.manifest.serviceWorkerPath)) continue;
    const wsUrl = assertLoopbackWebSocket(target.webSocketDebuggerUrl);
    const client = new CdpClient(wsUrl);
    await client.open();
    try {
      const basic = resultValue(await client.send('Runtime.evaluate', {
        expression: '({extensionId:chrome.runtime.id,manifest:chrome.runtime.getManifest(),serviceWorkerUrl:self.location.href})',
        returnByValue: true
      }));
      if (!manifestLooksLikeContract(basic.manifest, contract)) continue;
      try {
        const probe = resultValue(await client.send('Runtime.evaluate', {
          expression: buildPackageProbeExpression(contract),
          awaitPromise: true,
          returnByValue: true
        }));
        const scripts = await collectScriptSnapshot(client, probe.extensionId, contract);
        const snapshot = Object.freeze(Object.assign({}, probe, { loadedScripts: scripts }));
        validateRuntimeSnapshot(contract, snapshot);
        matches.push(snapshot);
      } catch (error) {
        matchingFailures.push(error);
      }
    } finally {
      client.close();
    }
  }
  if (matches.length > 1) fail('RUNTIME_ATTESTATION_TARGET_AMBIGUOUS');
  if (matches.length === 0) {
    if (matchingFailures.length) throw matchingFailures[0];
    fail('RUNTIME_ATTESTATION_TARGET_NOT_FOUND');
  }
  return Object.freeze({ snapshot: matches[0], browserVersion: String(version && version.Browser || '') });
}

function parseArgs(argv) {
  const out = { live: false, cdp: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--live') { out.live = true; continue; }
    if (arg === '--cdp') { out.cdp = String(argv[++index] || ''); continue; }
    fail('RUNTIME_ATTESTATION_ARGUMENT_INVALID', arg);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/chrome_p1_164_runtime_attestor.js --live --cdp http://127.0.0.1:9222\n');
    return;
  }
  if (process.env.CI && String(process.env.CI).toLowerCase() !== 'false') fail('RUNTIME_ATTESTATION_REFUSES_CI');
  if (!args.live || !args.cdp) fail('RUNTIME_ATTESTATION_LIVE_ARGUMENTS_REQUIRED');
  const head = exactHeadClean();
  const contract = expectedRuntimeContract(head);
  const live = await collectLiveSnapshot(contract, args.cdp);
  process.stdout.write(JSON.stringify(finalizeLiveAttestation(contract, live.snapshot, live.browserVersion), null, 2) + '\n');
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(String(error && error.code || 'RUNTIME_ATTESTATION_FAILED') + ': '
      + String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({
  ROOT,
  ATTESTATION_SCHEMA,
  CONTRACT_SCHEMA,
  EVIDENCE_CLASS,
  LIMITATIONS,
  exactHeadClean,
  parseStaticImportScripts,
  deriveWorkerScriptPaths,
  expectedRuntimeContract,
  extensionTarget,
  validateRuntimeSnapshot,
  finalizeLiveAttestation,
  buildPackageProbeExpression,
  assertLoopbackBase,
  assertLoopbackWebSocket,
  fetchJson,
  CdpClient,
  resultValue,
  parsedPath,
  collectScriptSnapshot,
  manifestLooksLikeContract,
  parseArgs
});
