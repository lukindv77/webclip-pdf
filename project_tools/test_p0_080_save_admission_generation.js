'use strict';
const assert = require('assert');
const {
  evaluateSelectionRecords,
  installSaveMessageGate,
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
    admit() {
      return { ok: false, code: 'WEBCLIP_SELECTION_MIXED_GENERATION', reason: 'mixed' };
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

  console.log(`PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
