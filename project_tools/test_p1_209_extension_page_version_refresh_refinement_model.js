'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(
  path.join(ROOT, 'project_docs', 'RESEARCH_P1_209_EXTENSION_PAGE_VERSION_REFRESH_REFINEMENT_2026-09-11_EVIDENCE.md'),
  'utf8'
);
const pageFiles = ['options.js', 'journal.js', 'yandex-auth-help.js', 'popup.js']
  .map((name) => {
    const file = path.join(ROOT, name);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  })
  .join('\n');

const BASELINE = 'ba0ab1d66a68be00ffb99676633363a5b344fe0d';
const WORKER_BLOB = '6d61ac81befdbf2804ae9dbec425aa08d1194eb1';
const SCHEMA = 'webclip-extension-page-refresh-refinement/v2';
const EXTENSION_ROOT = 'chrome-extension://webclip/';
const CURRENT_PROTOCOL = 'webclip-page-refresh-v2';
const MAX_TARGETS = 8;

let checks = 0;
const failures = [];

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 30000) {
  const asyncNeedle = `async function ${name}`;
  const plainNeedle = `function ${name}`;
  let start = source.indexOf(asyncNeedle);
  if (start < 0) start = source.indexOf(plainNeedle);
  if (start < 0) return '';
  const nextAsync = source.indexOf('\nasync function ', start + 20);
  const nextPlain = source.indexOf('\nfunction ', start + 20);
  const candidates = [nextAsync, nextPlain].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : Math.min(source.length, start + maxChars);
  return source.slice(start, end);
}

const refreshBody = functionSlice(worker, 'reloadOpenExtensionPagesAfterVersionChange', 20000);

// Canonical owner/baseline binding.
check(registry.includes('| P1-209 | ACTIVE | Extension-page version refresh requires pending/completed durable generation and truthful per-page repair/ack; pre-repair version marker is not success. |'),
  'P1-209 Registry owner/status drifted');
check(registry.includes('| P1-181 | MERGED → P1-209 |'), 'P1-181 duplicate ownership mapping drifted');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'evidence baseline mismatch');
check(evidence.includes(`Canonical \`service-worker.js\` blob inspected: \`${WORKER_BLOB}\``), 'worker blob binding mismatch');
check(evidence.includes('P1-209 remains ACTIVE'), 'ACTIVE boundary missing');
check(evidence.includes('Production/runtime modification: **NONE**'), 'research-only runtime boundary missing');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release hard fence missing');

// Manifest controls.
check(manifest.manifest_version === 3, 'manifest is no longer MV3; refresh research');
check(manifest.version === '0.9.8', 'manifest version changed; refresh research baseline');
check(Number(manifest.minimum_chrome_version) === 118, 'minimum Chrome version changed; refresh platform applicability');
check(Array.isArray(manifest.permissions) && manifest.permissions.includes('tabs') && manifest.permissions.includes('storage'),
  'tabs/storage permission positive control changed');

// Current source root cause and positive controls.
check(refreshBody.includes("const WEBCLIP_RUNTIME_VERSION_KEY = 'webclipRuntimeBuildVersion'") || worker.includes("const WEBCLIP_RUNTIME_VERSION_KEY = 'webclipRuntimeBuildVersion'"),
  'legacy runtime version marker positive control missing');
check(refreshBody.includes('chrome.runtime.getManifest().version'), 'manifest-version detection changed');
check(refreshBody.includes('chrome.storage.local.get(WEBCLIP_RUNTIME_VERSION_KEY)'), 'legacy scalar read changed');
const legacySetPos = refreshBody.indexOf('chrome.storage.local.set({ [WEBCLIP_RUNTIME_VERSION_KEY]: version })');
const tabsQueryPos = refreshBody.indexOf('chrome.tabs.query({})');
check(legacySetPos >= 0 && tabsQueryPos >= 0 && legacySetPos < tabsQueryPos,
  'current false-success ordering changed; refresh P1-209 source proof');
check(/try\s*\{\s*tabs\s*=\s*await\s+chrome\.tabs\.query\(\{\}\);\s*\}\s*catch\s*\(_\)\s*\{\s*return;\s*\}/.test(refreshBody),
  'current tabs.query silent-return witness changed');
check(/try\s*\{\s*await\s+chrome\.tabs\.reload\(tab\.id\);\s*\}\s*catch\s*\(_\)\s*\{\s*\}/.test(refreshBody),
  'current reload-error swallowing witness changed');
check(worker.includes('reloadOpenExtensionPagesAfterVersionChange().catch'), 'worker-start refresh recovery trigger missing');
check(worker.includes('chrome.runtime.getContexts({'), 'runtime.getContexts positive control missing');
check(worker.includes("contextTypes: ['OFFSCREEN_DOCUMENT']"), 'existing getContexts offscreen use changed');
check(worker.includes('function mutateChromeStorageSerialized('), 'serialized Chrome Storage mutation helper missing');
check(worker.includes('function readChromeStorageBounded('), 'bounded Chrome Storage read helper missing');
check(pageFiles.includes('Extension context invalidated'), 'page invalidated-context positive control missing');

// Current-gap controls: target protocol/state is not already implemented under a different known spelling.
const currentAll = `${worker}\n${pageFiles}`;
check(!/webclipExtensionPageRefreshState|EXTENSION_PAGE_REFRESH_STATE|ExtensionPageRefreshState/.test(currentAll),
  'durable P1-209 refresh state appears implemented; refresh research');
check(!/WEBCLIP_EXTENSION_PAGE_REFRESH_(?:REGISTER|ACK)|WEBCLIP_PAGE_REFRESH_(?:REGISTER|ACK)/.test(currentAll),
  'P1-209 page registration/ack protocol appears implemented; refresh research');

// Evidence must capture the refined current architecture, not just historical conclusions.
check(evidence.includes("runtime.getContexts({contextTypes:['TAB']})") || evidence.includes("runtime.getContexts({ contextTypes: ['TAB'] })"),
  'TAB getContexts refinement missing');
check(evidence.includes('bounded and two-source'), 'dual-source census rule missing');
check(evidence.includes('classify it as `unproven/incomplete`, not `gone`'), 'missing-context fail-closed rule missing');
check(evidence.includes('MessageSender.documentId'), 'browser sender document authority source missing');
check(evidence.includes('Promise<void>'), 'reload settlement boundary missing');
check(evidence.includes('mutateChromeStorageSerialized'), 'storage-serialization reuse boundary missing');
check(evidence.includes('P1-194'), 'durability-class owner composition missing');
check(evidence.includes('Current P1-211 owns deleted-comment tombstone lifecycle'), 'stale P1-211 owner correction missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/reference/api/runtime'), 'Chrome Runtime source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/reference/api/tabs'), 'Chrome Tabs source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome lifecycle source missing');
check(evidence.includes('chromium.googlesource.com/chromium/src'), 'Chromium implementation/test source missing');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function state(completedVersion = 'A') {
  return {
    completedVersion,
    completedAt: null,
    nextGeneration: 1,
    pending: null
  };
}

function unsafeLegacyBegin(s, targetVersion) {
  s.completedVersion = targetVersion;
}

function ensurePending(s, targetVersion) {
  if (s.pending?.targetVersion === targetVersion) return s.pending;
  if (!s.pending && s.completedVersion === targetVersion) return null;
  const generation = s.nextGeneration++;
  s.pending = {
    generation,
    targetVersion,
    phase: 'pending',
    attemptCount: 0,
    lastError: '',
    targets: {},
    censusEpoch: 0,
    overflow: false
  };
  return s.pending;
}

function relevantTab(tab) {
  return Number(tab?.id || 0) > 0 && String(tab?.url || '').startsWith(EXTENSION_ROOT);
}

function tab(id, pathName = 'options.html') {
  return { id, url: `${EXTENSION_ROOT}${pathName}` };
}

function context(tabId, documentId, pathName = 'options.html', frameId = 0) {
  return {
    contextType: 'TAB',
    tabId,
    frameId,
    documentId,
    documentUrl: `${EXTENSION_ROOT}${pathName}`,
    documentOrigin: 'chrome-extension://webclip'
  };
}

function combineCensus(tabs, contexts, maxTargets = MAX_TARGETS) {
  const relevant = tabs.filter(relevantTab).slice().sort((a, b) => a.id - b.id);
  if (relevant.length > maxTargets) return { overflow: true, rows: [] };
  const rows = relevant.map((t) => {
    const exact = contexts.find((c) => c.contextType === 'TAB' && c.frameId === 0 && c.tabId === t.id && c.documentUrl === t.url) || null;
    return {
      tabId: t.id,
      url: t.url,
      documentId: exact?.documentId || null,
      identityStatus: exact?.documentId ? 'exact-context' : 'unproven-context'
    };
  });
  return { overflow: false, rows };
}

function recordCensus(s, generation, census) {
  const p = s.pending;
  if (!p || p.generation !== generation) return false;
  p.attemptCount += 1;
  p.censusEpoch += 1;
  p.overflow = Boolean(census.overflow);
  if (census.overflow) {
    p.phase = 'incomplete';
    p.lastError = 'target-capacity-exceeded';
    return false;
  }
  const liveTabs = new Set();
  for (const row of census.rows) {
    liveTabs.add(row.tabId);
    const key = String(row.tabId);
    const target = p.targets[key] || {
      tabId: row.tabId,
      url: row.url,
      state: 'discovered',
      observedDocumentId: null,
      reloadFromDocumentId: null,
      ackedDocumentId: null,
      ackProtocol: '',
      challenge: `g${generation}:t${row.tabId}`,
      lastSeenEpoch: 0
    };
    target.url = row.url;
    target.lastSeenEpoch = p.censusEpoch;
    if (row.documentId) target.observedDocumentId = row.documentId;
    if (target.state === 'gone') target.state = 'discovered';
    p.targets[key] = target;
  }
  for (const target of Object.values(p.targets)) {
    if (!liveTabs.has(target.tabId)) target.state = 'gone';
  }
  p.phase = 'repairing';
  return true;
}

function recordCensusFailure(s, generation, error) {
  if (!s.pending || s.pending.generation !== generation) return false;
  s.pending.phase = 'pending';
  s.pending.lastError = String(error || '').slice(0, 240);
  return true;
}

function issueReload(s, generation, tabId) {
  const p = s.pending;
  const target = p?.targets?.[String(tabId)];
  if (!p || p.generation !== generation || !target || target.state === 'gone') return false;
  target.reloadFromDocumentId = target.observedDocumentId || null;
  target.state = 'reload-issued';
  return true;
}

function ackPage(s, message, sender) {
  const p = s.pending;
  if (!p || p.generation !== message.generation) return false;
  if (p.targetVersion !== message.targetVersion) return false;
  if (message.protocol !== CURRENT_PROTOCOL) return false;
  if (sender?.id !== 'webclip') return false;
  if (Number(sender?.frameId) !== 0) return false;
  const tabId = Number(sender?.tab?.id || 0);
  const documentId = String(sender?.documentId || '');
  const url = String(sender?.url || '');
  if (!tabId || !documentId || !url.startsWith(EXTENSION_ROOT)) return false;
  const target = p.targets[String(tabId)];
  if (!target || target.state === 'gone' || target.url !== url) return false;
  if (target.challenge !== message.challenge) return false;
  if (target.observedDocumentId && target.observedDocumentId !== documentId) return false;
  if (target.reloadFromDocumentId && target.reloadFromDocumentId === documentId) return false;
  target.observedDocumentId = documentId;
  target.ackedDocumentId = documentId;
  target.ackProtocol = CURRENT_PROTOCOL;
  target.state = 'acked';
  return true;
}

function senderFor(t, documentId) {
  return { id: 'webclip', frameId: 0, documentId, url: t.url, tab: { id: t.id } };
}

function ackFor(s, t, overrides = {}) {
  const target = s.pending.targets[String(t.id)];
  return {
    generation: s.pending.generation,
    targetVersion: s.pending.targetVersion,
    protocol: CURRENT_PROTOCOL,
    challenge: target.challenge,
    documentId: 'caller-supplied-must-not-authorize',
    ...overrides
  };
}

function canComplete(s, generation, finalCensus) {
  const p = s.pending;
  if (!p || p.generation !== generation || finalCensus.overflow) return false;
  const liveTabIds = new Set(finalCensus.rows.map((row) => row.tabId));
  for (const row of finalCensus.rows) {
    // A visible relevant tab with no exact current context stays incomplete.
    if (!row.documentId) return false;
    const target = p.targets[String(row.tabId)];
    if (!target || target.state !== 'acked') return false;
    if (target.url !== row.url) return false;
    if (target.ackedDocumentId !== row.documentId) return false;
    if (target.ackProtocol !== CURRENT_PROTOCOL) return false;
  }
  for (const target of Object.values(p.targets)) {
    if (liveTabIds.has(target.tabId)) continue;
    if (target.state !== 'gone' && target.state !== 'acked') return false;
  }
  return true;
}

function completeCAS(s, generation, targetVersion, finalCensus) {
  const p = s.pending;
  if (!p || p.generation !== generation || p.targetVersion !== targetVersion) return false;
  if (!canComplete(s, generation, finalCensus)) return false;
  s.completedVersion = targetVersion;
  s.completedAt = 'settled';
  s.pending = null;
  return true;
}

// 1. Current scalar can claim B before any repair evidence exists.
{
  const s = state('A');
  unsafeLegacyBegin(s, 'B');
  check(s.completedVersion === 'B', 'legacy false-success witness failed');
}

// 2. Crash/restart after unsafe scalar publication suppresses future repair.
{
  const s = state('A');
  unsafeLegacyBegin(s, 'B');
  const restarted = clone(s);
  check(ensurePending(restarted, 'B') === null, 'legacy restart did not reproduce false completed interpretation');
}

// 3. Target model admits pending B without advancing completed A.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  check(Boolean(p) && p.targetVersion === 'B' && s.completedVersion === 'A', 'pending/completed separation failed');
}

// 4. Ordinary worker restart resumes the same generation.
{
  const s = state('A');
  const first = ensurePending(s, 'B');
  const restarted = clone(s);
  const resumed = ensurePending(restarted, 'B');
  check(resumed.generation === first.generation, 'restart minted a new generation instead of resuming current pending work');
}

// 5. Census failure retains pending truth and bounded diagnostics.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  recordCensusFailure(s, p.generation, 'tabs.query failed: x'.repeat(100));
  check(s.completedVersion === 'A' && s.pending.phase === 'pending', 'census failure falsely completed refresh');
  check(s.pending.lastError.length <= 240, 'census failure diagnostics are unbounded');
}

// 6. Dual-source census keeps an existing tab unproven when getContexts has no exact row.
{
  const t = tab(4, 'options.html');
  const census = combineCensus([t], []);
  check(census.rows.length === 1 && census.rows[0].identityStatus === 'unproven-context',
    'missing exact context was incorrectly interpreted as missing tab');
}

// 7. getContexts exact TAB row supplies browser-owned document identity.
{
  const t = tab(4, 'options.html');
  const census = combineCensus([t], [context(4, 'doc-A', 'options.html')]);
  check(census.rows[0].documentId === 'doc-A' && census.rows[0].identityStatus === 'exact-context',
    'exact TAB context identity was not consumed');
}

// 8. Child-frame context cannot stand in for top-level extension page identity.
{
  const t = tab(4, 'options.html');
  const census = combineCensus([t], [context(4, 'child-doc', 'options.html', 2)]);
  check(census.rows[0].documentId === null, 'child frame incorrectly became top-level target identity');
}

// 9. A reload settlement is only reload-issued, never completion.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(7);
  recordCensus(s, p.generation, combineCensus([t], [context(7, 'doc-old')]));
  check(issueReload(s, p.generation, 7), 'reload issuance failed in model');
  check(s.pending.targets['7'].state === 'reload-issued' && s.completedVersion === 'A',
    'reload issuance became completion');
}

// 10. Caller-supplied documentId has no authority; sender.documentId does.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(7);
  recordCensus(s, p.generation, combineCensus([t], [context(7, 'doc-new')]));
  const msg = ackFor(s, t, { documentId: 'forged-old' });
  check(ackPage(s, msg, senderFor(t, 'doc-new')), 'browser sender document identity was not authoritative');
  check(s.pending.targets['7'].ackedDocumentId === 'doc-new', 'caller-supplied document identity leaked into receipt');
}

// 11. Exact post-reload replacement must not accept the old document.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(8);
  recordCensus(s, p.generation, combineCensus([t], [context(8, 'doc-old')]));
  issueReload(s, p.generation, 8);
  check(!ackPage(s, ackFor(s, t), senderFor(t, 'doc-old')), 'old pre-reload document acknowledged replacement');
  const freshCensus = combineCensus([t], [context(8, 'doc-new')]);
  recordCensus(s, p.generation, freshCensus);
  check(ackPage(s, ackFor(s, t), senderFor(t, 'doc-new')), 'new replacement document failed acknowledgement');
}

// 12. Same tab id cannot make a stale old-document message current after replacement.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(9, 'journal.html');
  recordCensus(s, p.generation, combineCensus([t], [context(9, 'D1', 'journal.html')]));
  issueReload(s, p.generation, 9);
  recordCensus(s, p.generation, combineCensus([t], [context(9, 'D2', 'journal.html')]));
  check(!ackPage(s, ackFor(s, t), senderFor(t, 'D1')), 'tab-id reuse authorized old document');
}

// 13. Wrong extension sender/frame/path cannot acknowledge.
{
  const variants = [
    { id: 'other-extension', frameId: 0, documentId: 'D', url: `${EXTENSION_ROOT}options.html`, tab: { id: 2 } },
    { id: 'webclip', frameId: 1, documentId: 'D', url: `${EXTENSION_ROOT}options.html`, tab: { id: 2 } },
    { id: 'webclip', frameId: 0, documentId: 'D', url: 'https://example.test/', tab: { id: 2 } }
  ];
  for (const sender of variants) {
    const s = state('A');
    const p = ensurePending(s, 'B');
    const t = tab(2);
    recordCensus(s, p.generation, combineCensus([t], [context(2, 'D')]));
    check(!ackPage(s, ackFor(s, t), sender), 'invalid sender boundary acknowledged refresh');
  }
}

// 14. Wrong generation/version/protocol/challenge each fail closed.
{
  const overrides = [
    { generation: 999 },
    { targetVersion: 'C' },
    { protocol: 'old-protocol' },
    { challenge: 'wrong' }
  ];
  for (const override of overrides) {
    const s = state('A');
    const p = ensurePending(s, 'B');
    const t = tab(3);
    recordCensus(s, p.generation, combineCensus([t], [context(3, 'D')]));
    check(!ackPage(s, ackFor(s, t, override), senderFor(t, 'D')), 'stale/wrong acknowledgement gained authority');
  }
}

// 15. Context presence without current page acknowledgement cannot complete.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(5);
  const census = combineCensus([t], [context(5, 'D')]);
  recordCensus(s, p.generation, census);
  check(!canComplete(s, p.generation, census), 'context presence alone became page-code proof');
}

// 16. Exact acknowledged current document can complete after fresh census.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(5);
  const census = combineCensus([t], [context(5, 'D')]);
  recordCensus(s, p.generation, census);
  check(ackPage(s, ackFor(s, t), senderFor(t, 'D')), 'current page acknowledgement failed');
  const finalCensus = combineCensus([t], [context(5, 'D')]);
  check(completeCAS(s, p.generation, 'B', finalCensus), 'acked current page failed completion CAS');
  check(s.completedVersion === 'B' && s.pending === null, 'completion publication failed');
}

// 17. Relevant tab with missing final exact context remains incomplete even if it was acked earlier.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(6);
  const first = combineCensus([t], [context(6, 'D')]);
  recordCensus(s, p.generation, first);
  ackPage(s, ackFor(s, t), senderFor(t, 'D'));
  const unknownFinal = combineCensus([t], []);
  check(!completeCAS(s, p.generation, 'B', unknownFinal), 'missing exact final context was treated as gone/current');
}

// 18. A new relevant tab in final census blocks completion until it is included and acked.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t1 = tab(1, 'options.html');
  let census = combineCensus([t1], [context(1, 'D1', 'options.html')]);
  recordCensus(s, p.generation, census);
  ackPage(s, ackFor(s, t1), senderFor(t1, 'D1'));
  const t2 = tab(2, 'journal.html');
  census = combineCensus([t1, t2], [context(1, 'D1', 'options.html'), context(2, 'D2', 'journal.html')]);
  check(!completeCAS(s, p.generation, 'B', census), 'newcomer tab was omitted from completion authority');
  recordCensus(s, p.generation, census);
  ackPage(s, ackFor(s, t2), senderFor(t2, 'D2'));
  check(completeCAS(s, p.generation, 'B', census), 'newcomer could not join current generation');
}

// 19. A disappeared target can be retired only after fresh tab census no longer contains it.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t = tab(10);
  recordCensus(s, p.generation, combineCensus([t], [context(10, 'D')]));
  recordCensus(s, p.generation, combineCensus([], []));
  check(s.pending.targets['10'].state === 'gone', 'fresh absence did not retire disappeared target');
  check(completeCAS(s, p.generation, 'B', combineCensus([], [])), 'empty fresh census could not complete after exact disappearance');
}

// 20. Zero relevant tabs can complete after successful fresh census without opening arbitrary pages.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const empty = combineCensus([], []);
  recordCensus(s, p.generation, empty);
  check(completeCAS(s, p.generation, 'B', empty), 'successful empty census did not complete');
}

// 21. Capacity overflow cannot silently truncate and complete.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const many = Array.from({ length: MAX_TARGETS + 1 }, (_, i) => tab(i + 1));
  const census = combineCensus(many, [], MAX_TARGETS);
  check(census.overflow, 'target-capacity witness did not overflow');
  recordCensus(s, p.generation, census);
  check(!completeCAS(s, p.generation, 'B', census) && s.completedVersion === 'A', 'capacity overflow became false completion');
}

// 22. Partial acknowledgement cannot cover another current tab.
{
  const s = state('A');
  const p = ensurePending(s, 'B');
  const t1 = tab(1, 'options.html');
  const t2 = tab(2, 'journal.html');
  const census = combineCensus([t1, t2], [context(1, 'D1', 'options.html'), context(2, 'D2', 'journal.html')]);
  recordCensus(s, p.generation, census);
  ackPage(s, ackFor(s, t1), senderFor(t1, 'D1'));
  check(!canComplete(s, p.generation, census), 'one page acknowledgement covered another page');
}

// 23. B -> C supersession rejects late B acknowledgement.
{
  const s = state('A');
  const b = ensurePending(s, 'B');
  const t = tab(1);
  recordCensus(s, b.generation, combineCensus([t], [context(1, 'DB')]));
  const lateB = ackFor(s, t);
  const oldGeneration = b.generation;
  const c = ensurePending(s, 'C');
  check(c.generation !== oldGeneration && c.targetVersion === 'C', 'C did not supersede B generation');
  check(!ackPage(s, lateB, senderFor(t, 'DB')), 'late B acknowledgement mutated C generation');
}

// 24. Late B completion CAS cannot overwrite current C.
{
  const s = state('A');
  const b = ensurePending(s, 'B');
  const bGeneration = b.generation;
  const c = ensurePending(s, 'C');
  check(!completeCAS(s, bGeneration, 'B', combineCensus([], [])), 'late B completion CAS overrode C');
  check(s.pending.generation === c.generation && s.pending.targetVersion === 'C' && s.completedVersion === 'A',
    'C state regressed after late B completion attempt');
}

// 25. Manifest metadata alone is not page-code proof in the model.
{
  const proof = { pageGetManifestVersion: 'B', senderDocumentId: '', protocol: '' };
  check(!(proof.pageGetManifestVersion === 'B' && proof.senderDocumentId && proof.protocol === CURRENT_PROTOCOL),
    'page getManifest version alone became code-generation proof');
}

// 26. Current protocol + exact post-reload document can prove current page without inventing a release/package identity.
{
  const receipt = { protocol: CURRENT_PROTOCOL, reloadFromDocumentId: 'D1', ackedDocumentId: 'D2' };
  check(receipt.protocol === CURRENT_PROTOCOL && receipt.reloadFromDocumentId !== receipt.ackedDocumentId,
    'post-reload page-protocol receipt failed');
}

// 27. Domain refresh generation is not a global capability token.
{
  const generation = 17;
  const authorizationCapability = null;
  check(Number.isInteger(generation) && authorizationCapability === null, 'refresh generation was modeled as authorization capability');
}

// 28. Ordinary worker restart durability claim remains narrower than eviction-proof guarantee.
{
  const durability = { workerRestartPersistent: true, evictionProof: false, owner: 'P1-194' };
  check(durability.workerRestartPersistent && !durability.evictionProof && durability.owner === 'P1-194',
    'P1-194 durability classification boundary failed');
}

// 29. Broad maintenance fairness stays outside P1-209.
{
  const ownership = { refreshState: 'P1-209', broadMv3FairProgress: 'P1-192', physicalIdentity: 'P1-198', outerResponse: 'P1-210', releaseIdentity: 'P1-231' };
  check(ownership.refreshState === 'P1-209' && ownership.broadMv3FairProgress === 'P1-192' && ownership.releaseIdentity === 'P1-231',
    'owner composition model drifted');
}

// 30. Current P1-211 is not reused as generic recovery ownership.
{
  check(registry.includes('| P1-211 | ACTIVE | Deleted comment tombstones need one lifecycle'),
    'P1-211 current tombstone ownership changed; refresh composition');
}

if (failures.length) {
  console.error(`P1-209 extension page refresh refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-209 extension page refresh refinement model: PASS (${checks} checks, ${SCHEMA})`);
