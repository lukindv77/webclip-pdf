'use strict';
const assert = require('node:assert/strict');

class RouteGeneration {
  constructor(entryId, href) {
    this.entryId = entryId;
    this.href = href;
    this.transitionGeneration = 1;
  }
  currentEntryChanged(entryId, href) {
    this.entryId = entryId;
    this.href = href;
    this.transitionGeneration += 1;
  }
  receipt() {
    return Object.freeze({ entryId: this.entryId, href: this.href, transitionGeneration: this.transitionGeneration });
  }
  boundaryCheck(receipt, currentEntryId, currentHref) {
    if (currentEntryId !== this.entryId || currentHref !== this.href) return 'missed-navigation-stale';
    if (receipt.transitionGeneration !== this.transitionGeneration) return 'older-transition-stale';
    if (receipt.entryId !== currentEntryId) return 'entry-stale';
    return 'current';
  }
}

(function pushCreatesNewEntryAndAdvancesGeneration() {
  const route = new RouteGeneration('E1', '/a');
  const old = route.receipt();
  route.currentEntryChanged('E2', '/b');
  assert.equal(route.boundaryCheck(old, 'E2', '/b'), 'older-transition-stale');
})();

(function traversalBackToSameOldEntryDoesNotResurrectOldReceipt() {
  const route = new RouteGeneration('E1', '/a');
  const old = route.receipt();
  route.currentEntryChanged('E2', '/b');
  route.currentEntryChanged('E1', '/a');
  assert.equal(route.entryId, old.entryId);
  assert.equal(route.href, old.href);
  assert.notEqual(route.transitionGeneration, old.transitionGeneration);
  assert.equal(route.boundaryCheck(old, 'E1', '/a'), 'older-transition-stale');
})();

(function missedEventStillFailsAtBoundaryWhenEntryChanged() {
  const route = new RouteGeneration('E1', '/a');
  const old = route.receipt();
  assert.equal(route.boundaryCheck(old, 'E2', '/b'), 'missed-navigation-stale');
})();

(function replaceEntryGetsFreshEntryEvidence() {
  const route = new RouteGeneration('E1', '/a');
  const old = route.receipt();
  route.currentEntryChanged('E3', '/a?mode=2');
  assert.equal(route.boundaryCheck(old, 'E3', '/a?mode=2'), 'older-transition-stale');
})();

console.log('P0-080 navigation-entry generation model: PASS');
