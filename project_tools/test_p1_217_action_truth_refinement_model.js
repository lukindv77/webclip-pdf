'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(
  path.join(root, 'project_docs', 'RESEARCH_P1_217_ACTION_TRUTH_REFINEMENT_2026-09-11_EVIDENCE.md'),
  'utf8'
);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function bodyBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `Missing start marker: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `Missing end marker after ${startMarker}: ${endMarker}`);
  return text.slice(start, end);
}

function visual(truth, urlIdentity, extra = {}) {
  const base = {
    truth,
    urlIdentity: String(urlIdentity || ''),
    icon: 'neutral',
    badge: '',
    title: 'WebClip PDF'
  };
  if (truth === 'unknown') base.title = 'WebClip PDF — состояние текущей страницы проверяется';
  if (truth === 'degraded') base.title = 'WebClip PDF — состояние текущей страницы недоступно';
  if (truth === 'not-applicable') base.title = 'WebClip PDF';
  if (truth === 'known-empty') {
    base.icon = 'known-empty';
    base.title = 'WebClip PDF — журнал для текущей страницы пуст';
  }
  if (truth === 'known-history') {
    base.icon = 'known-history';
    base.badge = String(Math.max(0, Number(extra.uniqueDays || 0)));
    base.title = `WebClip PDF — сохранено дней: ${base.badge}`;
  }
  return { ...base, ...extra, truth, urlIdentity: String(urlIdentity || '') };
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || ''));
}

// ---------------------------------------------------------------------------
// Exact current-source / owner bindings.
// ---------------------------------------------------------------------------

assert.strictEqual(manifest.version, '0.9.8', 'P1-217 refinement must not change manifest version.');
assert.strictEqual(manifest.minimum_chrome_version, '118', 'Current minimum Chrome version drifted.');

const registryRow = '| P1-217 | ACTIVE | Chrome Action requires explicit unknown/degraded truth; failed current read cannot leave previous URL\'s icon/badge/title on the tab. |';
assert.ok(registry.includes(registryRow), 'Canonical P1-217 Registry owner/status row changed.');

assert.ok(
  evidence.includes('81ea6b9e2679e09de765651c577e7274941dad00'),
  'Evidence must bind the exact canonical baseline.'
);
assert.ok(
  evidence.includes('6d61ac81befdbf2804ae9dbec425aa08d1194eb1'),
  'Evidence must bind the exact current service-worker.js blob.'
);
assert.ok(
  evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'),
  'Hard release fence must remain explicit.'
);
assert.ok(evidence.includes('P1-130'), 'P1-217 must preserve P1-130 ownership boundary.');
assert.ok(evidence.includes('P1-170'), 'P1-217 must preserve P1-170 ownership boundary.');
assert.ok(evidence.includes('P1-216'), 'P1-217 must compose with P1-216 URL identity.');
assert.ok(evidence.includes('P0-080'), 'P1-217 must preserve P0-080 same-document application ownership.');

// Existing P1-130 positive controls remain present in current production source.
assert.match(worker, /const\s+actionUpdateGenerationByTab\s*=\s*new Map\s*\(\s*\)/);
assert.match(worker, /function\s+beginActionUpdateGeneration\s*\(/);
assert.match(worker, /function\s+isActionUpdateGenerationCurrent\s*\(/);
assert.match(worker, /async function\s+runChromeActionMutationBounded\s*\(/);
assert.match(worker, /async function\s+applyChromeActionMutationBestEffort\s*\(/);
assert.match(worker, /async function\s+getJournalSummaryForUrl\s*\(/);

const updateAction = bodyBetween(
  worker,
  'async function updateActionForTab(tabId, knownUrl = \'\')',
  'async function refreshActionForAllTabs()'
);
const summaryIndex = updateAction.indexOf('const summary = await getJournalSummaryForUrl(url);');
assert.ok(summaryIndex >= 0, 'Current Action refresh must still use the Journal summary path.');

const firstKnownMutationIndices = [
  updateAction.indexOf('chrome.action.setIcon', summaryIndex),
  updateAction.indexOf('chrome.action.setBadgeText', summaryIndex),
  updateAction.indexOf('chrome.action.setTitle', summaryIndex)
].filter((index) => index >= 0);
assert.ok(firstKnownMutationIndices.length >= 3, 'Current known Action vector mutations are missing.');
assert.ok(
  firstKnownMutationIndices.every((index) => summaryIndex < index),
  'Current source shape changed: research gap assumes Journal summary is awaited before HTTP(S) known-state mutations.'
);

const beforeSummary = updateAction.slice(0, summaryIndex);
assert.doesNotMatch(
  beforeSummary,
  /current-summary-pending|known-empty|summary-read-failed|read-unavailable|degraded/i,
  'Current source now appears to publish explicit P1-217 truth before summary; re-research owner before using this model.'
);

assert.match(worker, /chrome\.tabs\.onUpdated\.addListener\s*\(/);
assert.match(worker, /if\s*\(changeInfo\.url\s*\|\|\s*changeInfo\.status\s*===\s*['"]complete['"]\)/);
assert.match(worker, /updateActionForTab\(tabId,\s*changeInfo\.url\s*\|\|\s*tab\?\.url\s*\|\|\s*['"]['"]\)\.catch\(\(\)\s*=>\s*\{\}\)/);
assert.match(worker, /chrome\.tabs\.onActivated\.addListener\s*\(/);
assert.match(worker, /refreshActionForAllTabs\s*\(\s*\)\.catch\s*\(\s*\(\)\s*=>\s*\{\}\s*\)/);
assert.ok(
  !worker.includes('chrome.tabs.onReplaced.addListener'),
  'Current source now has explicit tabs.onReplaced reconciliation; re-research replacement behavior.'
);

// ---------------------------------------------------------------------------
// Browser-owned Action reset model from fresh Chromium source evidence.
// ---------------------------------------------------------------------------

class ChromiumActionProjection {
  constructor() {
    this.byTab = new Map();
  }

  get(tabId) {
    const value = this.byTab.get(Number(tabId));
    return value ? JSON.parse(JSON.stringify(value)) : null;
  }

  set(tabId, value) {
    this.byTab.set(Number(tabId), JSON.parse(JSON.stringify(value)));
  }

  committedCrossDocumentNavigation(tabId) {
    // Current Chromium ExtensionActionRunner clears all imperative per-tab
    // Action values after committed primary-main-frame cross-document navigation.
    this.byTab.delete(Number(tabId));
  }

  sameDocumentNavigation(_tabId) {
    // Current Chromium returns before ClearAllValuesForTab when IsSameDocument().
  }

  close(tabId) {
    this.byTab.delete(Number(tabId));
  }
}

function currentWebClipHttpRefresh(browserProjection, tabId, currentUrl, outcome) {
  // Current WebClip HTTP(S) shape performs no Action publication before the
  // Journal summary. A rejected summary therefore changes no browser-owned visual.
  if (!isHttpUrl(currentUrl)) {
    browserProjection.set(tabId, visual('not-applicable', currentUrl));
    return;
  }
  if (outcome?.type === 'reject') return;
  if (Number(outcome?.uniqueDays || 0) > 0) {
    browserProjection.set(tabId, visual('known-history', currentUrl, { uniqueDays: outcome.uniqueDays }));
  } else {
    browserProjection.set(tabId, visual('known-empty', currentUrl));
  }
}

const A = 'https://app.example/items/1';
const B = 'https://app.example/items/2';
const C = 'https://app.example/items/3';

// Correction A: ordinary committed cross-document navigation is a Chromium
// positive control. Browser clearing prevents the old A vector from surviving
// solely because WebClip's B summary read rejects.
{
  const browser = new ChromiumActionProjection();
  browser.set(7, visual('known-history', A, { uniqueDays: 7 }));
  browser.committedCrossDocumentNavigation(7);
  currentWebClipHttpRefresh(browser, 7, B, { type: 'reject' });
  assert.strictEqual(browser.get(7), null);
}

// Confirmed residual B: same-document / SPA URL change does not get Chromium's
// ClearAllValuesForTab. Current WebClip B read rejects before any B publication,
// leaving the concrete A vector installed.
{
  const browser = new ChromiumActionProjection();
  browser.set(7, visual('known-history', A, { uniqueDays: 7 }));
  browser.sameDocumentNavigation(7);
  currentWebClipHttpRefresh(browser, 7, B, { type: 'reject' });
  const installed = browser.get(7);
  assert.strictEqual(installed.truth, 'known-history');
  assert.strictEqual(installed.urlIdentity, A);
  assert.strictEqual(installed.badge, '7');
}

// Same-root-cause variant: a failed revalidation on the same URL leaves an older
// concrete snapshot installed even though its current validity is unproven.
{
  const browser = new ChromiumActionProjection();
  browser.set(7, visual('known-history', A, { uniqueDays: 2 }));
  currentWebClipHttpRefresh(browser, 7, A, { type: 'reject' });
  assert.strictEqual(browser.get(7).badge, '2');
}

// ---------------------------------------------------------------------------
// Refined target semantic state machine.
// ---------------------------------------------------------------------------

class TargetActionModel {
  constructor(browser = new ChromiumActionProjection()) {
    this.browser = browser;
    this.generationByTab = new Map();
    this.requestByTab = new Map();
  }

  nextGeneration(tabId) {
    const id = Number(tabId);
    const next = (Number(this.generationByTab.get(id) || 0) + 1) >>> 0 || 1;
    this.generationByTab.set(id, next);
    return next;
  }

  admit(tabId, url) {
    const id = Number(tabId);
    assert.ok(id > 0, 'tabId must be positive');
    const generation = this.nextGeneration(id);
    const urlIdentity = String(url || '');
    const request = { tabId: id, generation, urlIdentity };
    this.requestByTab.set(id, request);

    // Core P1-217 target: revoke old concrete truth before a fallible read.
    this.browser.set(
      id,
      isHttpUrl(urlIdentity)
        ? visual('unknown', urlIdentity, { reason: 'current-summary-pending' })
        : visual('not-applicable', urlIdentity, { reason: 'current-url-not-applicable' })
    );
    return { ...request };
  }

  isCurrent(request) {
    const current = this.requestByTab.get(Number(request?.tabId || 0));
    return Boolean(current)
      && current.generation === Number(request?.generation || 0)
      && current.urlIdentity === String(request?.urlIdentity || '');
  }

  settleSuccess(request, summary) {
    if (!this.isCurrent(request)) return false;
    const days = Math.max(0, Number(summary?.uniqueDays || 0));
    this.browser.set(
      request.tabId,
      days > 0
        ? visual('known-history', request.urlIdentity, { uniqueDays: days })
        : visual('known-empty', request.urlIdentity)
    );
    return true;
  }

  settleFailure(request, reason = 'summary-read-failed') {
    if (!this.isCurrent(request)) return false;
    this.browser.set(
      request.tabId,
      visual('degraded', request.urlIdentity, { reason: String(reason || 'summary-read-failed') })
    );
    return true;
  }

  remove(tabId) {
    const id = Number(tabId);
    this.requestByTab.delete(id);
    this.generationByTab.delete(id);
    this.browser.close(id);
  }
}

// Target 1: same-document A -> B immediately revokes A before B read.
{
  const browser = new ChromiumActionProjection();
  const target = new TargetActionModel(browser);
  const reqA = target.admit(7, A);
  assert.ok(target.settleSuccess(reqA, { uniqueDays: 7 }));
  browser.sameDocumentNavigation(7);
  const reqB = target.admit(7, B);
  assert.strictEqual(browser.get(7).truth, 'unknown');
  assert.strictEqual(browser.get(7).urlIdentity, B);
  assert.strictEqual(browser.get(7).badge, '');
  assert.ok(target.settleFailure(reqB, 'indexeddb-timeout'));
  assert.strictEqual(browser.get(7).truth, 'degraded');
  assert.strictEqual(browser.get(7).urlIdentity, B);
  assert.strictEqual(browser.get(7).badge, '');
}

// Target 2: a failed same-URL current read also settles degraded instead of
// preserving an older known snapshot.
{
  const browser = new ChromiumActionProjection();
  const target = new TargetActionModel(browser);
  const first = target.admit(7, A);
  target.settleSuccess(first, { uniqueDays: 4 });
  const refresh = target.admit(7, A);
  assert.strictEqual(browser.get(7).truth, 'unknown');
  target.settleFailure(refresh, 'journal-rebuild-failed');
  assert.strictEqual(browser.get(7).truth, 'degraded');
  assert.strictEqual(browser.get(7).badge, '');
}

// Target 3: verified empty is evidence-backed and distinct from degraded.
{
  const browser = new ChromiumActionProjection();
  const target = new TargetActionModel(browser);
  const emptyReq = target.admit(7, B);
  target.settleSuccess(emptyReq, { uniqueDays: 0 });
  const knownEmpty = browser.get(7);
  assert.strictEqual(knownEmpty.truth, 'known-empty');

  const failedReq = target.admit(7, B);
  target.settleFailure(failedReq, 'read-unavailable');
  const degraded = browser.get(7);
  assert.strictEqual(degraded.truth, 'degraded');
  assert.notStrictEqual(knownEmpty.title, degraded.title);
}

// Target 4: late A/B completion cannot overwrite newest C.
{
  const browser = new ChromiumActionProjection();
  const target = new TargetActionModel(browser);
  const reqA = target.admit(7, A);
  const reqB = target.admit(7, B);
  const reqC = target.admit(7, C);
  assert.strictEqual(target.settleSuccess(reqA, { uniqueDays: 9 }), false);
  assert.strictEqual(target.settleFailure(reqB, 'late-B-failure'), false);
  assert.ok(target.settleSuccess(reqC, { uniqueDays: 3 }));
  assert.strictEqual(browser.get(7).urlIdentity, C);
  assert.strictEqual(browser.get(7).badge, '3');
}

// Target 5: unsupported/restricted current URL is explicit neutral/not-applicable,
// never prior-site concrete truth and never a fabricated known-empty Journal read.
{
  const browser = new ChromiumActionProjection();
  const target = new TargetActionModel(browser);
  const reqA = target.admit(7, A);
  target.settleSuccess(reqA, { uniqueDays: 5 });
  target.admit(7, 'chrome://settings/');
  const current = browser.get(7);
  assert.strictEqual(current.truth, 'not-applicable');
  assert.strictEqual(current.badge, '');
  assert.strictEqual(current.urlIdentity, 'chrome://settings/');
}

// Target 6: worker restart does not restore old projection as authority. The
// browser may still have a concrete vector, but the new worker's first admitted
// refresh overwrites it with unknown before any fallible Journal read.
{
  const browser = new ChromiumActionProjection();
  browser.set(7, visual('known-history', A, { uniqueDays: 6 }));

  // New worker = new in-memory generation map, same browser-owned projection.
  const restartedWorker = new TargetActionModel(browser);
  const request = restartedWorker.admit(7, B);
  assert.strictEqual(browser.get(7).truth, 'unknown');
  assert.strictEqual(browser.get(7).urlIdentity, B);
  restartedWorker.settleFailure(request, 'worker-restart-read-unavailable');
  assert.strictEqual(browser.get(7).truth, 'degraded');
}

// Target 7: tab removal/replacement cannot let an old request keep authority in
// this semantic model. Exact replacement event wiring is intentionally not
// prescribed by P1-217; physical Chrome evidence decides the implementation path.
{
  const browser = new ChromiumActionProjection();
  const target = new TargetActionModel(browser);
  const old = target.admit(7, A);
  target.remove(7);
  assert.strictEqual(target.settleSuccess(old, { uniqueDays: 8 }), false);
  assert.strictEqual(browser.get(7), null);
}

console.log('P1-217 Chrome Action current-truth refinement model: PASS');
