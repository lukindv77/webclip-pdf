'use strict';

const assert = require('node:assert/strict');

class ApplicationAuthority {
  constructor({ documentId, href }) {
    this.documentId = documentId;
    this.href = href;
    this.applicationGeneration = 1;
    this.selectionRevision = 0;
    this.selection = [];
    this.staleReason = '';
  }

  select(nodes) {
    this.selection = nodes.slice();
    this.selectionRevision += 1;
    this.staleReason = '';
    return this.receipt();
  }

  sameDocumentNavigation(nextHref) {
    this.href = nextHref;
    this.applicationGeneration += 1;
    this.staleReason = 'same-document-navigation';
  }

  observeHrefAtBoundary(currentHref) {
    if (currentHref !== this.href) {
      this.sameDocumentNavigation(currentHref);
      return false;
    }
    return true;
  }

  checkLiveSelection() {
    if (!this.selection.length) return { ok: false, reason: 'no-selection' };
    for (const node of this.selection) {
      if (!node.isConnected || node.documentId !== this.documentId) {
        this.staleReason = 'selection-disconnected-or-wrong-document';
        return { ok: false, reason: this.staleReason };
      }
    }
    return this.staleReason ? { ok: false, reason: this.staleReason } : { ok: true };
  }

  receipt() {
    return Object.freeze({
      version: 1,
      documentId: this.documentId,
      applicationGeneration: this.applicationGeneration,
      href: this.href,
      selectionRevision: this.selectionRevision
    });
  }

  admitSave(expectedReceipt, currentHref) {
    this.observeHrefAtBoundary(currentHref);
    const live = this.checkLiveSelection();
    if (!live.ok) return { outcome: 'stale-selection', reason: live.reason };
    const current = this.receipt();
    if (expectedReceipt.documentId !== current.documentId) return { outcome: 'stale-document' };
    if (expectedReceipt.applicationGeneration !== current.applicationGeneration) return { outcome: 'stale-application-generation' };
    if (expectedReceipt.selectionRevision !== current.selectionRevision) return { outcome: 'stale-selection-revision' };
    return { outcome: 'admitted', receipt: current };
  }
}

function node(documentId, isConnected = true) {
  return { documentId, isConnected };
}

(function sameDocumentRouteChangeInvalidatesSelectionEvenWithSameDocumentId() {
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const old = app.select([node('D')]);
  app.sameDocumentNavigation('https://app.test/b');
  assert.equal(app.documentId, 'D');
  assert.equal(app.admitSave(old, 'https://app.test/b').outcome, 'stale-selection');
})();

(function pushStateDetectedAtSaveBoundaryWithoutMonkeyPatchingHistory() {
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const old = app.select([node('D')]);
  const actualLocationAfterPagePushState = 'https://app.test/b';
  const result = app.admitSave(old, actualLocationAfterPagePushState);
  assert.equal(result.outcome, 'stale-selection');
  assert.equal(app.applicationGeneration, 2);
})();

(function abaUrlDoesNotResurrectOldGeneration() {
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const old = app.select([node('D')]);
  app.sameDocumentNavigation('https://app.test/b');
  app.sameDocumentNavigation('https://app.test/a');
  assert.equal(app.href, old.href);
  assert.notEqual(app.applicationGeneration, old.applicationGeneration);
  assert.equal(app.admitSave(old, 'https://app.test/a').outcome, 'stale-selection');
})();

(function disconnectedNodeFailsEvenWithoutUrlChange() {
  const selected = node('D');
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const receipt = app.select([selected]);
  selected.isConnected = false;
  const result = app.admitSave(receipt, 'https://app.test/a');
  assert.equal(result.outcome, 'stale-selection');
  assert.equal(result.reason, 'selection-disconnected-or-wrong-document');
})();

(function sameUrlNewDocumentCannotReuseSelection() {
  const selected = node('D1');
  const app = new ApplicationAuthority({ documentId: 'D1', href: 'https://app.test/a' });
  const old = app.select([selected]);
  selected.documentId = 'D2';
  assert.equal(app.admitSave(old, 'https://app.test/a').outcome, 'stale-selection');
})();

(function explicitReselectBindsNewApplicationGeneration() {
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const old = app.select([node('D')]);
  app.sameDocumentNavigation('https://app.test/b');
  assert.notEqual(app.applicationGeneration, old.applicationGeneration);
  const fresh = app.select([node('D')]);
  assert.equal(fresh.applicationGeneration, app.applicationGeneration);
  assert.equal(app.admitSave(fresh, 'https://app.test/b').outcome, 'admitted');
})();

(function selectionRevisionPreventsOldDialogReceiptAfterUserEditsSelection() {
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const dialogReceipt = app.select([node('D')]);
  app.select([node('D'), node('D')]);
  const result = app.admitSave(dialogReceipt, 'https://app.test/a');
  assert.equal(result.outcome, 'stale-selection-revision');
})();

(function laterApplicationGenerationCannotBeCollapsedToDocumentIdOnly() {
  const app = new ApplicationAuthority({ documentId: 'D', href: 'https://app.test/a' });
  const first = app.receipt();
  app.sameDocumentNavigation('https://app.test/b');
  const second = app.receipt();
  assert.equal(first.documentId, second.documentId);
  assert.notEqual(first.applicationGeneration, second.applicationGeneration);
})();

console.log('P0-080 SPA/application generation model: PASS');
