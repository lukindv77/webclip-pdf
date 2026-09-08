'use strict';

const assert = require('assert');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || ''));
}

function unknownVisual(urlIdentity, reason = 'loading') {
  return {
    truth: 'unknown',
    urlIdentity: String(urlIdentity || ''),
    icon: 'neutral',
    badge: '',
    title: 'WebClip PDF — состояние текущей страницы проверяется',
    reason
  };
}

function degradedVisual(urlIdentity, reason) {
  return {
    truth: 'degraded',
    urlIdentity: String(urlIdentity || ''),
    icon: 'neutral',
    badge: '',
    title: 'WebClip PDF — состояние текущей страницы недоступно',
    reason: String(reason || 'read-unavailable')
  };
}

function knownEmptyVisual(urlIdentity) {
  return {
    truth: 'known-empty',
    urlIdentity: String(urlIdentity || ''),
    icon: 'known-empty',
    badge: '',
    title: 'WebClip PDF — журнал для текущей страницы пуст',
    reason: ''
  };
}

function knownHistoryVisual(urlIdentity, uniqueDays) {
  return {
    truth: 'known-history',
    urlIdentity: String(urlIdentity || ''),
    icon: 'known-history',
    badge: String(Math.max(0, Number(uniqueDays || 0))),
    title: `WebClip PDF — сохранено дней: ${Math.max(0, Number(uniqueDays || 0))}`,
    reason: ''
  };
}

class ActionTruthModel {
  constructor() {
    this.tabs = new Map();
    this.nextNavigationGeneration = 1;
  }

  current(tabId) {
    const state = this.tabs.get(Number(tabId));
    return state ? clone(state.visual) : null;
  }

  record(tabId) {
    return this.tabs.get(Number(tabId)) || null;
  }

  admit(tabId, url, documentGeneration = '') {
    const id = Number(tabId);
    assert.ok(id > 0, 'tabId must be positive');
    const previous = this.tabs.get(id);
    const generation = Number(previous?.generation || 0) + 1;
    const navigationGeneration = this.nextNavigationGeneration++;
    const urlIdentity = String(url || '');
    const documentKey = String(documentGeneration || `doc-${navigationGeneration}`);
    const request = { tabId: id, generation, navigationGeneration, documentKey, urlIdentity };

    const visual = isHttpUrl(urlIdentity)
      ? unknownVisual(urlIdentity, 'current-summary-pending')
      : degradedVisual(urlIdentity, 'current-url-unavailable-or-restricted');

    this.tabs.set(id, { ...request, visual });
    return clone(request);
  }

  requestIsCurrent(request) {
    const state = this.tabs.get(Number(request?.tabId || 0));
    if (!state) return false;
    return state.generation === request.generation
      && state.navigationGeneration === request.navigationGeneration
      && state.documentKey === request.documentKey
      && state.urlIdentity === request.urlIdentity;
  }

  settleSuccess(request, summary) {
    if (!this.requestIsCurrent(request)) return false;
    const state = this.tabs.get(request.tabId);
    const uniqueDays = Math.max(0, Number(summary?.uniqueDays || 0));
    state.visual = uniqueDays > 0
      ? knownHistoryVisual(request.urlIdentity, uniqueDays)
      : knownEmptyVisual(request.urlIdentity);
    return true;
  }

  settleFailure(request, reason = 'summary-read-failed') {
    if (!this.requestIsCurrent(request)) return false;
    const state = this.tabs.get(request.tabId);
    state.visual = degradedVisual(request.urlIdentity, reason);
    return true;
  }

  close(tabId) {
    this.tabs.delete(Number(tabId));
  }

  replace(oldTabId, newTabId, newUrl, newDocumentGeneration = '') {
    this.close(oldTabId);
    return this.admit(newTabId, newUrl, newDocumentGeneration);
  }

  restart(liveTabs) {
    this.tabs.clear();
    const requests = [];
    for (const live of liveTabs || []) {
      requests.push(this.admit(live.tabId, live.url, live.documentGeneration));
    }
    return requests;
  }
}

// Counterexample for the current legacy shape: a failed B read publishes nothing,
// so browser-owned visual state A remains installed.
function legacyRefreshInstalledVisual(installedVisual, currentUrl, outcome) {
  if (!isHttpUrl(currentUrl)) return degradedVisual(currentUrl, 'restricted');
  if (outcome?.type === 'reject') return clone(installedVisual);
  return Number(outcome?.uniqueDays || 0) > 0
    ? knownHistoryVisual(currentUrl, outcome.uniqueDays)
    : knownEmptyVisual(currentUrl);
}

const A = 'https://a.example/article';
const B = 'https://b.example/article';
const C = 'https://c.example/article';

// Current-source counterexample: A truth can survive navigation to B when B read fails.
const legacyA = knownHistoryVisual(A, 7);
const legacyAfterBFailure = legacyRefreshInstalledVisual(legacyA, B, { type: 'reject' });
assert.strictEqual(legacyAfterBFailure.truth, 'known-history');
assert.strictEqual(legacyAfterBFailure.urlIdentity, A);
assert.strictEqual(legacyAfterBFailure.badge, '7');
console.log('P1-217 current-shape counterexample: stale A survives failed B refresh');

// A. Navigation A -> B, read B fails: A authority is revoked at B admission.
{
  const model = new ActionTruthModel();
  const reqA = model.admit(7, A, 'doc-A');
  assert.ok(model.settleSuccess(reqA, { uniqueDays: 7 }));
  const reqB = model.admit(7, B, 'doc-B');
  assert.deepStrictEqual(model.current(7), unknownVisual(B, 'current-summary-pending'));
  assert.ok(model.settleFailure(reqB, 'indexeddb-timeout'));
  const visual = model.current(7);
  assert.strictEqual(visual.truth, 'degraded');
  assert.strictEqual(visual.urlIdentity, B);
  assert.strictEqual(visual.badge, '');
  assert.ok(!visual.title.includes('7'));
}

// B. A delayed, B succeeds first: late A cannot overwrite B.
{
  const model = new ActionTruthModel();
  const reqA = model.admit(7, A, 'doc-A');
  const reqB = model.admit(7, B, 'doc-B');
  assert.ok(model.settleSuccess(reqB, { uniqueDays: 2 }));
  assert.strictEqual(model.settleSuccess(reqA, { uniqueDays: 9 }), false);
  assert.strictEqual(model.current(7).urlIdentity, B);
  assert.strictEqual(model.current(7).badge, '2');
}

// C. A delayed, B fails: late A still cannot replace B degraded truth.
{
  const model = new ActionTruthModel();
  const reqA = model.admit(7, A, 'doc-A');
  const reqB = model.admit(7, B, 'doc-B');
  assert.ok(model.settleFailure(reqB, 'journal-read-rejected'));
  assert.strictEqual(model.settleSuccess(reqA, { uniqueDays: 9 }), false);
  assert.strictEqual(model.current(7).truth, 'degraded');
  assert.strictEqual(model.current(7).urlIdentity, B);
}

// D. Rapid A -> B -> C: only the latest navigation generation has authority.
{
  const model = new ActionTruthModel();
  const reqA = model.admit(7, A, 'doc-A');
  const reqB = model.admit(7, B, 'doc-B');
  const reqC = model.admit(7, C, 'doc-C');
  assert.strictEqual(model.settleSuccess(reqB, { uniqueDays: 4 }), false);
  assert.strictEqual(model.settleFailure(reqA, 'late-A-failure'), false);
  assert.ok(model.settleSuccess(reqC, { uniqueDays: 3 }));
  assert.strictEqual(model.current(7).urlIdentity, C);
  assert.strictEqual(model.current(7).badge, '3');
}

// E. Tab closed/replaced before completion: old completion has no authority.
{
  const model = new ActionTruthModel();
  const oldReq = model.admit(7, A, 'doc-A');
  const replacementReq = model.replace(7, 9, B, 'doc-B');
  assert.strictEqual(model.settleSuccess(oldReq, { uniqueDays: 8 }), false);
  assert.strictEqual(model.current(7), null);
  assert.ok(model.settleSuccess(replacementReq, { uniqueDays: 1 }));
  assert.strictEqual(model.current(9).urlIdentity, B);
}

// F. Worker restart: previous concrete URL truth is not restored without current evidence.
{
  const oldWorker = new ActionTruthModel();
  const oldReq = oldWorker.admit(7, A, 'doc-A');
  oldWorker.settleSuccess(oldReq, { uniqueDays: 6 });
  assert.strictEqual(oldWorker.current(7).truth, 'known-history');

  const newWorker = new ActionTruthModel();
  const [currentReq] = newWorker.restart([{ tabId: 7, url: B, documentGeneration: 'doc-B' }]);
  assert.strictEqual(newWorker.current(7).truth, 'unknown');
  assert.strictEqual(newWorker.current(7).urlIdentity, B);
  newWorker.settleFailure(currentReq, 'worker-restart-read-unavailable');
  assert.strictEqual(newWorker.current(7).truth, 'degraded');
  assert.strictEqual(newWorker.current(7).urlIdentity, B);
}

// G. Restricted/unavailable current URL is explicit neutral/degraded, never prior-site truth.
{
  const model = new ActionTruthModel();
  const reqA = model.admit(7, A, 'doc-A');
  model.settleSuccess(reqA, { uniqueDays: 5 });
  model.admit(7, 'chrome://settings/', 'doc-restricted');
  const visual = model.current(7);
  assert.strictEqual(visual.truth, 'degraded');
  assert.strictEqual(visual.icon, 'neutral');
  assert.strictEqual(visual.badge, '');
}

// H. Verified empty and unavailable read are distinct semantic states.
{
  const model = new ActionTruthModel();
  const emptyReq = model.admit(7, B, 'doc-B1');
  model.settleSuccess(emptyReq, { uniqueDays: 0 });
  const knownEmpty = model.current(7);
  assert.strictEqual(knownEmpty.truth, 'known-empty');

  const failedReq = model.admit(7, B, 'doc-B2');
  model.settleFailure(failedReq, 'permission-or-storage-unavailable');
  const degraded = model.current(7);
  assert.strictEqual(degraded.truth, 'degraded');
  assert.notStrictEqual(knownEmpty.truth, degraded.truth);
  assert.notStrictEqual(knownEmpty.title, degraded.title);
}

console.log('P1-217 Action truth deterministic model: PASS');
