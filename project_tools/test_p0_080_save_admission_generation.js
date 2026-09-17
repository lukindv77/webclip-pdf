'use strict';
const assert = require('assert');
const {
  INCLUDE_ATTR,
  evaluateSelectionRecords,
  createTracker,
  installSelectionAdmission,
  installSaveMessageGate,
  installConfirmationCommandObserver,
  getMessageIndex
} = require('../application-generation.js');

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };

const current = Object.freeze({ generation: 3, href: 'https://example.test/article', reason: 'history-state' });
const currentRecord = { selected: true, connected: true, inCurrentDocumentSet: true, receipt: current };

let result = evaluateSelectionRecords([], current);
ok(result.ok, 'empty selection has no stale authority to reject');
eq(result.selectedCount, 0, 'empty selection count is explicit');

result = evaluateSelectionRecords([currentRecord], current);
ok(result.ok, 'current connected selection is admitted');
eq(result.selectedCount, 1, 'current selection count is preserved');

result = evaluateSelectionRecords([{ ...currentRecord, connected: false }], current);
eq(result.ok, false, 'disconnected selection is rejected');
eq(result.code, 'WEBCLIP_SELECTION_DETACHED', 'disconnected rejection is explicit');

result = evaluateSelectionRecords([{ ...currentRecord, inCurrentDocumentSet: false }], current);
eq(result.ok, false, 'selection from a detached document is rejected');
eq(result.code, 'WEBCLIP_SELECTION_DETACHED', 'detached document uses fail-closed code');

result = evaluateSelectionRecords([{ ...currentRecord, receipt: null }], current);
eq(result.ok, false, 'untracked selected attribute is rejected');
eq(result.code, 'WEBCLIP_SELECTION_UNTRACKED', 'untracked rejection is explicit');

const old = Object.freeze({ generation: 2, href: current.href, reason: 'selection-set' });
result = evaluateSelectionRecords([{ ...currentRecord, receipt: old }], current);
eq(result.ok, false, 'stale generation is rejected');
eq(result.code, 'WEBCLIP_SELECTION_STALE_GENERATION', 'stale rejection is explicit');

result = evaluateSelectionRecords([currentRecord, { ...currentRecord, receipt: old }], current);
eq(result.ok, false, 'mixed generations are rejected');
eq(result.code, 'WEBCLIP_SELECTION_MIXED_GENERATION', 'mixed-generation rejection is explicit');

const oldHref = Object.freeze({ generation: current.generation, href: 'https://example.test/other', reason: 'selection-set' });
result = evaluateSelectionRecords([{ ...currentRecord, receipt: oldHref }], current);
eq(result.ok, false, 'same counter with wrong logical href is rejected');
eq(result.code, 'WEBCLIP_SELECTION_STALE_GENERATION', 'href mismatch is stale authority');
eq(getMessageIndex([{ type: 'WEBCLIP_GENERATE_PDF' }]), 0, 'one-argument sendMessage locates message');
eq(getMessageIndex(['extension-id', { type: 'WEBCLIP_GENERATE_PDF' }]), 1, 'extension-id overload locates message');

class FakeMutationObserver {
  static instances = [];
  constructor(callback) {
    this.callback = callback;
    FakeMutationObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  static fire(records) {
    for (const instance of FakeMutationObserver.instances) instance.callback(records);
  }
}

function makeSelectionFixture() {
  const elements = [];
  const frames = [];
  const doc = {
    documentElement: {},
    querySelectorAll(selector) {
      if (selector === 'iframe,frame') return frames;
      return elements.filter((element) => element.hasAttribute('data-webclip-pdf-include') || element.hasAttribute('data-webclip-pdf-exclude'));
    }
  };
  class FakeElement {
    constructor() {
      this.ownerDocument = doc;
      this.isConnected = true;
      this.attrs = new Map();
      elements.push(this);
    }
    setAttribute(name, value) { this.attrs.set(String(name), String(value)); }
    removeAttribute(name) { this.attrs.delete(String(name)); }
    hasAttribute(name) { return this.attrs.has(String(name)); }
    getAttribute(name) { return this.attrs.has(String(name)) ? this.attrs.get(String(name)) : null; }
  }
  const win = { Element: FakeElement, MutationObserver: FakeMutationObserver };
  doc.defaultView = win;
  return { doc, win, FakeElement };
}

(async () => {
  const rawCalls = [];
  const chromeApi = {
    runtime: {
      sendMessage: (...args) => {
        rawCalls.push(args);
        return Promise.resolve({ ok: true });
      }
    }
  };
  let admitted = 0;
  const receipt = Object.freeze({ applicationGeneration: current, selectedCount: 1 });
  installSaveMessageGate(chromeApi, {
    admit() {
      admitted += 1;
      return { ok: true, receipt };
    }
  });

  await chromeApi.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF', operationId: 'op-1' });
  eq(admitted, 1, 'PDF generation command performs admission');
  eq(rawCalls.length, 1, 'admitted save reaches runtime');
  eq(rawCalls[0][0].operationId, 'op-1', 'original save payload is preserved');
  eq(rawCalls[0][0].webclipGeneration, receipt, 'admitted save carries immutable generation receipt downstream');

  await chromeApi.runtime.sendMessage({ type: 'WEBCLIP_PROGRESS', operationId: 'op-1' });
  eq(admitted, 1, 'unrelated runtime messages are not generation-gated');
  eq(rawCalls.length, 2, 'unrelated message passes through unchanged');

  const rejectedCalls = [];
  const rejectedChrome = {
    runtime: {
      sendMessage: (...args) => {
        rejectedCalls.push(args);
        return Promise.resolve({ ok: true });
      }
    }
  };
  installSaveMessageGate(rejectedChrome, {
    admitForSave() {
      return { ok: false, code: 'WEBCLIP_SELECTION_MIXED_GENERATION', reason: 'mixed' };
    },
    admit() {
      throw new Error('admit fallback must not run when confirmation-aware admission exists');
    }
  });
  const rejected = await rejectedChrome.runtime.sendMessage({ type: 'WEBCLIP_SEND_PDF_TO_YANDEX' });
  eq(rejected.ok, false, 'rejected save resolves to explicit failure');
  eq(rejected.code, 'WEBCLIP_SELECTION_MIXED_GENERATION', 'rejected save preserves admission code');
  eq(rejectedCalls.length, 0, 'rejected save never reaches privileged runtime handler');

  let callbackResult = null;
  rejectedChrome.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF' }, (value) => { callbackResult = value; });
  await Promise.resolve();
  ok(callbackResult && callbackResult.ok === false, 'callback overload receives fail-closed result');
  eq(rejectedCalls.length, 0, 'callback rejection also avoids privileged runtime handler');

  const commandListeners = [];
  let captures = 0;
  let clears = 0;
  const commandChrome = {
    runtime: {
      onMessage: {
        addListener(listener) { commandListeners.push(listener); }
      }
    }
  };
  const commandObserver = installConfirmationCommandObserver(commandChrome, {
    captureConfirmation() { captures += 1; return { ok: true }; },
    clearConfirmation() { clears += 1; }
  });
  ok(commandObserver.installed, 'confirmation observer installs without replacing onMessage.addListener');
  eq(commandListeners.length, 1, 'confirmation observer uses one ordinary runtime listener');
  commandListeners[0]({ type: 'WEBCLIP_COMMAND', command: 'finish' });
  commandListeners[0]({ type: 'WEBCLIP_COMMAND', command: 'download' });
  commandListeners[0]({ type: 'WEBCLIP_COMMAND', command: 'yandex' });
  eq(captures, 3, 'manual save entry commands capture confirmation authority');
  commandListeners[0]({ type: 'WEBCLIP_COMMAND', command: 'read-later' });
  eq(clears, 1, 'automatic read-later clears old dialog confirmation and uses immediate admission');
  commandListeners[0]({ type: 'WEBCLIP_PROGRESS' });
  eq(captures, 3, 'unrelated messages do not capture confirmation');
  eq(clears, 1, 'unrelated messages do not clear confirmation');

  FakeMutationObserver.instances.length = 0;
  const fixture = makeSelectionFixture();
  let href = 'https://example.test/article';
  const tracker = createTracker({ readHref: () => href });
  const admission = installSelectionAdmission({
    document: fixture.doc,
    MutationObserver: FakeMutationObserver
  }, tracker);
  const first = new fixture.FakeElement();
  first.setAttribute(INCLUDE_ATTR, 'include-1');
  result = admission.captureConfirmation();
  ok(result.ok, 'connected current selection can be captured for confirmation');
  const capturedRevision = result.receipt.selectionRevision;
  ok(Number.isSafeInteger(capturedRevision), 'confirmation receipt carries exact selection revision');
  result = admission.admitForSave();
  ok(result.ok, 'unchanged confirmed selection remains admitted');
  eq(result.receipt.confirmedSelectionRevision, capturedRevision, 'save receipt binds the confirmed selection revision');

  first.setAttribute(INCLUDE_ATTR, 'include-2');
  result = admission.admitForSave();
  eq(result.ok, false, 'selection mutation after confirmation is rejected');
  eq(result.code, 'WEBCLIP_SAVE_CONFIRMATION_STALE', 'post-confirmation mutation uses explicit stale-confirmation code');

  result = admission.captureConfirmation();
  ok(result.ok, 'fresh confirmation can bind the changed live selection');
  first.isConnected = false;
  result = admission.admitForSave();
  eq(result.ok, false, 'selection detached after confirmation is revalidated at save');
  eq(result.code, 'WEBCLIP_SELECTION_DETACHED', 'detached revalidation preserves precise failure code');
  first.isConnected = true;

  result = admission.captureConfirmation();
  ok(result.ok, 'selection can be reconfirmed after reconnect in the current document');
  const second = new fixture.FakeElement();
  tracker.advance('history-state', href);
  second.setAttribute(INCLUDE_ATTR, 'include-3');
  result = admission.admitForSave();
  eq(result.ok, false, 'mixed old/new generation selection is rejected after confirmation');
  eq(result.code, 'WEBCLIP_SELECTION_MIXED_GENERATION', 'mixed-generation revalidation remains fail closed');
  second.removeAttribute(INCLUDE_ATTR);
  first.setAttribute(INCLUDE_ATTR, 'include-4');
  result = admission.captureConfirmation();
  ok(result.ok, 'current-generation selection can be confirmed after stale selection is restamped');

  first.attrs.set(INCLUDE_ATTR, 'page-world-change');
  FakeMutationObserver.fire([{ type: 'attributes', target: first }]);
  result = admission.admitForSave();
  eq(result.ok, false, 'page-world selected-marker mutation cannot silently inherit old receipt');
  eq(result.code, 'WEBCLIP_SELECTION_UNTRACKED', 'unobserved selected-marker mutation fails as untracked authority');

  admission.dispose();
  console.log(`PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
