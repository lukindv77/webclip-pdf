'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const guard = require('../content-injection-guard.js');

let checks = 0;
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function ok(value, message) { assert.ok(value, message); checks += 1; }
async function rejectsCode(promiseFactory, code, message) {
  let error = null;
  try { await promiseFactory(); } catch (err) { error = err; }
  ok(error, `${message}: expected rejection`);
  eq(error.code, code, `${message}: code`);
}

function message(operationId = 'op-1', generation = 4, href = 'https://example.test/app') {
  return {
    type: 'WEBCLIP_GENERATE_PDF',
    operationId,
    webclipGeneration: {
      applicationGeneration: { generation, href, reason: 'save-admission' },
      selectionRevision: 7,
      selectedCount: 2,
      confirmedSelectionRevision: 7
    }
  };
}

function sender(documentId = 'doc-A', frameId = 0) {
  return {
    tab: { id: 17 },
    frameId,
    documentId,
    documentLifecycle: 'active'
  };
}

(async () => {
  const normalized = guard.normalizeWorkerSaveAdmission(message(), sender(), 1234);
  eq(normalized.operationId, 'op-1', 'operation identity retained');
  eq(normalized.tabId, 17, 'tab identity retained');
  eq(normalized.sourceDocumentId, 'doc-A', 'browser document identity retained separately');
  eq(normalized.applicationGeneration.generation, 4, 'application generation retained separately');
  eq(normalized.applicationGeneration.href, 'https://example.test/app', 'application href retained');
  eq(normalized.selectionRevision, 7, 'selection revision retained');
  eq(normalized.confirmedSelectionRevision, 7, 'confirmed revision retained');
  eq(normalized.capturedAt, 1234, 'capture timestamp retained');
  ok(!Object.hasOwn(normalized.applicationGeneration, 'documentId'), 'application generation does not absorb documentId');

  assert.throws(
    () => guard.normalizeWorkerSaveAdmission(message(), sender('', 0)),
    (error) => error?.code === 'WEBCLIP_SOURCE_DOCUMENT_ID_REQUIRED',
    'missing sender.documentId fails closed'
  );
  checks += 1;
  assert.throws(
    () => guard.normalizeWorkerSaveAdmission(message(), sender('doc-A', 3)),
    (error) => error?.code === 'WEBCLIP_SOURCE_TOP_DOCUMENT_REQUIRED',
    'subframe save admission fails closed'
  );
  checks += 1;
  const missingGeneration = message('op-missing');
  delete missingGeneration.webclipGeneration;
  assert.throws(
    () => guard.normalizeWorkerSaveAdmission(missingGeneration, sender()),
    (error) => error?.code === 'WEBCLIP_SOURCE_APPLICATION_GENERATION_REQUIRED',
    'missing P0-080 receipt fails closed'
  );
  checks += 1;

  let currentGeneration = 4;
  let currentHref = 'https://example.test/app';
  let currentDocumentId = 'doc-A';
  const executeCalls = [];
  const tabMessages = [];
  const chromeApi = {
    scripting: {
      async executeScript(details) {
        executeCalls.push(details);
        if (currentDocumentId !== 'doc-A') throw new Error('No matching document');
        return [{
          frameId: 0,
          documentId: currentDocumentId,
          result: {
            applicationGeneration: { generation: currentGeneration, href: currentHref, reason: 'probe' },
            href: currentHref,
            topDocument: true
          }
        }];
      }
    },
    tabs: {
      async sendMessage(tabId, payload, options) {
        tabMessages.push({ tabId, payload, options });
        return { ok: true, diagnostics: { current: { selectedCount: 2 } } };
      }
    }
  };

  let now = 10_000;
  const controller = guard.createWorkerSourceGenerationController(chromeApi, { now: () => now, ttlMs: 5_000 });
  eq(controller.capture(message('op-2'), sender()), false, 'capture listener never responds');
  const admitted = controller.consume('op-2', 17);
  eq(admitted.sourceDocumentId, 'doc-A', 'consume returns exact source document');
  eq(admitted.applicationGeneration.generation, 4, 'consume returns application generation');
  await controller.assertCurrent(admitted);
  eq(executeCalls.at(-1).target.tabId, 17, 'probe targets admitted tab');
  assert.deepEqual(executeCalls.at(-1).target.documentIds, ['doc-A'], 'probe targets exact admitted documentId');
  checks += 1;
  eq(executeCalls.at(-1).world, 'ISOLATED', 'probe executes in isolated world');

  currentGeneration = 5;
  await rejectsCode(
    () => controller.assertCurrent(admitted),
    'WEBCLIP_SOURCE_APPLICATION_CHANGED',
    'same document with newer SPA generation is rejected'
  );
  currentGeneration = 4;
  currentHref = 'https://example.test/other';
  await rejectsCode(
    () => controller.assertCurrent(admitted),
    'WEBCLIP_SOURCE_APPLICATION_CHANGED',
    'same generation number with different application href is rejected'
  );
  currentHref = 'https://example.test/app';
  currentDocumentId = 'doc-B';
  await rejectsCode(
    () => controller.assertCurrent(admitted),
    'WEBCLIP_SOURCE_DOCUMENT_CHANGED',
    'same-tab replacement document is rejected'
  );
  currentDocumentId = 'doc-A';

  controller.capture(message('op-dup'), sender());
  controller.capture(message('op-dup'), sender());
  await rejectsCode(
    async () => controller.consume('op-dup', 17),
    'WEBCLIP_SOURCE_ADMISSION_DUPLICATE',
    'duplicate logical operation admission is rejected'
  );

  const bad = message('op-bad');
  bad.webclipGeneration.applicationGeneration.generation = 0;
  controller.capture(bad, sender());
  await rejectsCode(
    async () => controller.consume('op-bad', 17),
    'WEBCLIP_SOURCE_APPLICATION_GENERATION_REQUIRED',
    'invalid captured receipt is preserved as a fail-closed rejection'
  );

  controller.capture(message('op-expire'), sender());
  now += 6_000;
  await rejectsCode(
    async () => controller.consume('op-expire', 17),
    'WEBCLIP_SOURCE_ADMISSION_REQUIRED',
    'expired admission cannot authorize a later operation'
  );
  now = 20_000;

  let rawBlobCalls = 0;
  let rawDiagnosticsCalls = 0;
  let mutateDuringRawBlob = false;
  const host = {
    async generatePdfBlob(tabId) {
      rawBlobCalls += 1;
      if (mutateDuringRawBlob) currentGeneration = 6;
      return { size: 111, tabId };
    },
    async collectPrintDiagnosticsForTab() {
      rawDiagnosticsCalls += 1;
      return { legacy: true };
    },
    sanitizePrintStructureDiagnostics(value) { return { sanitized: true, ...value }; },
    async generatePdfAndDownload(tabId, meta, operationId) {
      const blob = await this.generatePdfBlob(tabId);
      const diagnostics = await this.collectPrintDiagnosticsForTab(tabId);
      return { ok: true, operationId, title: meta.title, blob, diagnostics };
    },
    async generatePdfAndUploadToYandex(tabId, meta, operationId) {
      const blob = await this.generatePdfBlob(tabId);
      const diagnostics = await this.collectPrintDiagnosticsForTab(tabId);
      return { ok: true, operationId, title: meta.title, blob, diagnostics };
    }
  };
  const installed = guard.installWorkerSourceGenerationWrappers(host, controller);
  ok(installed.installed, 'worker source-generation wrappers install');

  controller.capture(message('op-download'), sender());
  const result = await host.generatePdfAndDownload(17, { title: 'A' }, 'op-download');
  ok(result.ok, 'unchanged exact source reaches downstream generation');
  eq(rawBlobCalls, 1, 'raw PDF generation executes once');
  eq(rawDiagnosticsCalls, 0, 'legacy tab-only diagnostics path is bypassed for generation-bound save');
  eq(tabMessages.length, 1, 'exact diagnostics IPC executes once');
  eq(tabMessages[0].tabId, 17, 'exact diagnostics target admitted tab');
  eq(tabMessages[0].options.documentId, 'doc-A', 'exact diagnostics target admitted documentId');
  eq(result.diagnostics.sanitized, true, 'exact diagnostics retain sanitizer boundary');
  eq(controller.active(17), null, 'active source receipt is retired after operation');

  controller.capture(message('op-race'), sender());
  currentGeneration = 4;
  mutateDuringRawBlob = true;
  await rejectsCode(
    () => host.generatePdfAndDownload(17, { title: 'A' }, 'op-race'),
    'WEBCLIP_SOURCE_APPLICATION_CHANGED',
    'installed post-render fence rejects generation change during provisional render'
  );
  eq(rawBlobCalls, 2, 'race reaches raw PDF generation once before post-check rejection');
  eq(tabMessages.length, 1, 'stale provisional PDF never reaches diagnostics or downstream stage');
  eq(controller.active(17), null, 'failed operation retires active source receipt');
  mutateDuringRawBlob = false;
  currentGeneration = 4;

  controller.capture(message('op-replace'), sender());
  currentDocumentId = 'doc-B';
  await rejectsCode(
    () => host.generatePdfAndUploadToYandex(17, { title: 'A' }, 'op-replace'),
    'WEBCLIP_SOURCE_DOCUMENT_CHANGED',
    'replacement document is rejected before Yandex generation starts'
  );
  eq(rawBlobCalls, 2, 'replacement document is rejected before raw PDF bytes exist');
  currentDocumentId = 'doc-A';

  const root = path.resolve(__dirname, '..');
  const bootstrap = fs.readFileSync(path.join(root, 'journal-text-filter.js'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert.match(bootstrap, /importScripts\('pdf-print-guard\.js',\s*'content-injection-guard\.js',\s*'operation-log-redaction-guard\.js'\)/);
  checks += 1;
  for (const name of ['generatePdfAndDownload', 'generatePdfAndUploadToYandex', 'generatePdfBlob', 'collectPrintDiagnosticsForTab']) {
    assert.match(worker, new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`), `${name} remains a top-level worker function boundary`);
    checks += 1;
  }
  assert.match(worker, /case 'WEBCLIP_GENERATE_PDF'[\s\S]*generatePdfAndDownload\(tabId,/);
  checks += 1;
  assert.match(worker, /case 'WEBCLIP_SEND_PDF_TO_YANDEX'[\s\S]*generatePdfAndUploadToYandex\(tabId,/);
  checks += 1;

  console.log(`P0-070 source-document/application-generation admission: PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
