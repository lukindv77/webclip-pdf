'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}
function throwsCode(fn, code, message) {
  let error = null;
  try { fn(); } catch (err) { error = err; }
  check(Boolean(error), `${message}: expected throw`);
  equal(error.code, code, `${message}: error code`);
}

function node(id, connected = true) {
  return { id, isConnected: connected };
}

// ---------------------------------------------------------------------------
// Current-source behavioral model for P0-080.
// The fresh source keeps direct Element references in includes/excludes,
// totalIncludeCount() counts Map.size, and same-document SPA navigation has no
// application-generation fence in content.js.
// ---------------------------------------------------------------------------
class CurrentSelectionAuthority {
  constructor(url) {
    this.url = url;
    this.documentId = 'doc-A';
    this.includes = new Map();
    this.nextIncludeId = 1;
  }

  include(element) {
    const id = String(this.nextIncludeId++);
    this.includes.set(id, element);
    return id;
  }

  totalIncludeCount() {
    return this.includes.size;
  }

  visibleOutlineCount() {
    return [...this.includes.values()].filter((element) => element.isConnected).length;
  }

  sameDocumentNavigate({ url, replacement }) {
    // History API / SPA transition: same browser Document/documentId.
    this.url = url;
    if (replacement) {
      for (const element of this.includes.values()) element.isConnected = false;
    }
    // Current source has no application generation and does not prune includes.
  }

  buildSaveMeta() {
    return { url: this.url, documentId: this.documentId };
  }

  admitSave() {
    if (!this.totalIncludeCount()) {
      const error = new Error('no includes');
      error.code = 'NO_SELECTION';
      throw error;
    }
    return {
      meta: this.buildSaveMeta(),
      liveIncludes: [...this.includes.values()].filter((element) => element.isConnected),
    };
  }
}

// ---------------------------------------------------------------------------
// Candidate acceptance model. This is intentionally not a final implementation
// prescription. It expresses invariants P0-080 closure must satisfy:
// * browser document identity and application generation are separate;
// * potential same-document route changes force selection revalidation;
// * detached selected nodes fail closed independently of URL;
// * save confirmation is bound to exact application/selection generations;
// * state-only History API use with unchanged URL/DOM is not blindly treated
//   as a logical route change.
// ---------------------------------------------------------------------------
class GenerationBoundSelectionAuthority {
  constructor(url) {
    this.url = url;
    this.documentId = 'doc-A';
    this.applicationGeneration = 1;
    this.selectionGeneration = 1;
    this.includes = new Map();
    this.nextIncludeId = 1;
    this.needsReview = false;
  }

  include(element) {
    const id = String(this.nextIncludeId++);
    this.includes.set(id, element);
    this.selectionGeneration += 1;
    return id;
  }

  liveIncludes() {
    return [...this.includes.values()].filter((element) => element.isConnected);
  }

  noteHistorySignal({ beforeUrl, afterUrl }) {
    this.url = afterUrl;
    if (beforeUrl !== afterUrl) {
      this.applicationGeneration += 1;
      if (this.includes.size) this.needsReview = true;
    }
  }

  noteStateOnlyHistorySignal() {
    // pushState/replaceState may be used only to persist UI state. A signal
    // without URL change or selected-DOM invalidation is not enough to invent
    // a new logical page generation.
  }

  noteDomMutation() {
    if (this.liveIncludes().length !== this.includes.size) {
      this.applicationGeneration += 1;
      this.needsReview = true;
    }
  }

  revalidateSelection() {
    const live = this.liveIncludes();
    if (!live.length) {
      const error = new Error('selection detached');
      error.code = 'SELECTION_DETACHED';
      throw error;
    }
    // Review is an explicit user/application-boundary acknowledgement after
    // current live DOM has been checked.
    this.needsReview = false;
    this.selectionGeneration += 1;
    return live.map((element) => element.id);
  }

  beginSaveConfirmation() {
    if (this.needsReview) {
      const error = new Error('selection requires revalidation');
      error.code = 'SELECTION_REVALIDATION_REQUIRED';
      throw error;
    }
    const live = this.liveIncludes();
    if (!live.length || live.length !== this.includes.size) {
      const error = new Error('selection not fully live');
      error.code = 'SELECTION_NOT_LIVE';
      throw error;
    }
    return {
      documentId: this.documentId,
      applicationGeneration: this.applicationGeneration,
      selectionGeneration: this.selectionGeneration,
      url: this.url,
      liveIds: live.map((element) => element.id),
    };
  }

  confirmSave(receipt) {
    if (receipt.documentId !== this.documentId) {
      const error = new Error('document generation changed');
      error.code = 'DOCUMENT_GENERATION_CHANGED';
      throw error;
    }
    if (receipt.applicationGeneration !== this.applicationGeneration) {
      const error = new Error('application generation changed');
      error.code = 'APPLICATION_GENERATION_CHANGED';
      throw error;
    }
    if (receipt.selectionGeneration !== this.selectionGeneration) {
      const error = new Error('selection generation changed');
      error.code = 'SELECTION_GENERATION_CHANGED';
      throw error;
    }
    if (receipt.url !== this.url) {
      const error = new Error('route metadata changed');
      error.code = 'ROUTE_CHANGED';
      throw error;
    }
    const live = this.liveIncludes();
    if (!live.length || live.length !== this.includes.size) {
      const error = new Error('selection detached');
      error.code = 'SELECTION_NOT_LIVE';
      throw error;
    }
    equal(live.map((element) => element.id).join(','), receipt.liveIds.join(','), 'confirmed live set matches receipt');
    return { ok: true, url: this.url, applicationGeneration: this.applicationGeneration };
  }
}

// Current failure schedule: route A selection survives as stale authority while
// metadata changes to route B and the selected element is detached.
{
  const authority = new CurrentSelectionAuthority('https://example.test/item/a');
  const a = node('A');
  authority.include(a);
  equal(authority.totalIncludeCount(), 1, 'current route A has one include');
  equal(authority.visibleOutlineCount(), 1, 'current route A renders one outline');

  authority.sameDocumentNavigate({
    url: 'https://example.test/item/b',
    replacement: true,
  });

  equal(authority.documentId, 'doc-A', 'same-document navigation keeps browser documentId');
  equal(authority.totalIncludeCount(), 1, 'current stale include still authorizes by map size');
  equal(authority.visibleOutlineCount(), 0, 'current disconnected include no longer renders');
  const admitted = authority.admitSave();
  equal(admitted.meta.url, 'https://example.test/item/b', 'current save metadata uses newer route B');
  equal(admitted.meta.documentId, 'doc-A', 'current metadata still has same browser document identity');
  equal(admitted.liveIncludes.length, 0, 'current admitted save has no live selected node');
}

// Same-URL DOM replacement is also unsafe: URL/documentId alone cannot detect it.
{
  const authority = new CurrentSelectionAuthority('https://example.test/inbox');
  authority.include(node('mail-1'));
  authority.sameDocumentNavigate({
    url: 'https://example.test/inbox',
    replacement: true,
  });
  equal(authority.totalIncludeCount(), 1, 'same-URL replacement leaves stale current include count');
  equal(authority.visibleOutlineCount(), 0, 'same-URL replacement disconnects current selection');
  equal(authority.admitSave().meta.url, 'https://example.test/inbox', 'same URL cannot prove same application generation');
}

// Candidate: URL-changing SPA transition requires explicit selection revalidation.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/item/a');
  const a = node('A');
  authority.include(a);
  const generationBefore = authority.applicationGeneration;
  authority.noteHistorySignal({
    beforeUrl: 'https://example.test/item/a',
    afterUrl: 'https://example.test/item/b',
  });
  equal(authority.applicationGeneration, generationBefore + 1, 'candidate route change advances application generation');
  throwsCode(
    () => authority.beginSaveConfirmation(),
    'SELECTION_REVALIDATION_REQUIRED',
    'candidate blocks silent save after route change'
  );
}

// Candidate: detached selection fails closed even with unchanged URL.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/inbox');
  const a = node('mail-1');
  authority.include(a);
  a.isConnected = false;
  authority.noteDomMutation();
  throwsCode(
    () => authority.beginSaveConfirmation(),
    'SELECTION_REVALIDATION_REQUIRED',
    'candidate blocks save after same-URL selected-node detachment'
  );
  throwsCode(
    () => authority.revalidateSelection(),
    'SELECTION_DETACHED',
    'candidate cannot revalidate when no live include remains'
  );
}

// Candidate: route change may preserve the selected DOM object, but save cannot
// silently cross generations. Explicit revalidation can re-bind live selection.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/list?page=1');
  const a = node('results');
  authority.include(a);
  authority.noteHistorySignal({
    beforeUrl: 'https://example.test/list?page=1',
    afterUrl: 'https://example.test/list?page=2',
  });
  throwsCode(
    () => authority.beginSaveConfirmation(),
    'SELECTION_REVALIDATION_REQUIRED',
    'candidate requires review when route metadata changes'
  );
  equal(authority.revalidateSelection().join(','), 'results', 'candidate can re-bind still-live selection after review');
  const receipt = authority.beginSaveConfirmation();
  equal(receipt.url, 'https://example.test/list?page=2', 'revalidated receipt binds current route');
  check(authority.confirmSave(receipt).ok, 'revalidated current-generation save succeeds');
}

// Candidate: a route changes after save dialog opened; confirmation fails.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/a');
  authority.include(node('article'));
  const receipt = authority.beginSaveConfirmation();
  authority.noteHistorySignal({
    beforeUrl: 'https://example.test/a',
    afterUrl: 'https://example.test/b',
  });
  throwsCode(
    () => authority.confirmSave(receipt),
    'APPLICATION_GENERATION_CHANGED',
    'candidate stale save confirmation is rejected'
  );
}

// Candidate: selection mutation after dialog opened is independently fenced.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/a');
  authority.include(node('article'));
  const receipt = authority.beginSaveConfirmation();
  authority.include(node('aside'));
  throwsCode(
    () => authority.confirmSave(receipt),
    'SELECTION_GENERATION_CHANGED',
    'candidate stale confirmation cannot ignore newer selection'
  );
}

// Candidate: browser document navigation is a distinct, stronger generation.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/a');
  authority.include(node('article'));
  const receipt = authority.beginSaveConfirmation();
  authority.documentId = 'doc-B';
  throwsCode(
    () => authority.confirmSave(receipt),
    'DOCUMENT_GENERATION_CHANGED',
    'candidate preserves browser document generation fence'
  );
}

// Negative control from real SPA practice: state-only History API use with
// unchanged URL and unchanged selected DOM does not itself force a false page
// transition.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/map');
  authority.include(node('map'));
  const appGeneration = authority.applicationGeneration;
  authority.noteStateOnlyHistorySignal();
  equal(authority.applicationGeneration, appGeneration, 'state-only history signal does not invent logical generation');
  const receipt = authority.beginSaveConfirmation();
  check(authority.confirmSave(receipt).ok, 'state-only history update preserves valid live selection');
}

// Multiple route changes cannot accidentally reuse an old confirmation.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/a');
  authority.include(node('root'));
  const stale = authority.beginSaveConfirmation();
  authority.noteHistorySignal({ beforeUrl: 'https://example.test/a', afterUrl: 'https://example.test/b' });
  authority.revalidateSelection();
  const current = authority.beginSaveConfirmation();
  authority.noteHistorySignal({ beforeUrl: 'https://example.test/b', afterUrl: 'https://example.test/c' });
  throwsCode(() => authority.confirmSave(stale), 'APPLICATION_GENERATION_CHANGED', 'old A receipt rejected after two route changes');
  throwsCode(() => authority.confirmSave(current), 'APPLICATION_GENERATION_CHANGED', 'B receipt rejected after route C');
}

// A detached stale include can coexist with a newer live include. Candidate
// requires exact live-set reconciliation instead of accepting Map.size > 0.
{
  const authority = new GenerationBoundSelectionAuthority('https://example.test/a');
  const oldNode = node('old');
  authority.include(oldNode);
  oldNode.isConnected = false;
  authority.include(node('new'));
  authority.noteDomMutation();
  throwsCode(
    () => authority.beginSaveConfirmation(),
    'SELECTION_REVALIDATION_REQUIRED',
    'mixed stale/live includes cannot silently authorize'
  );
}

console.log(`P0-080 SPA/application-generation model: PASS ${checks} checks`);
