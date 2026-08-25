const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createContext(downloadPromise, events) {
  let downloadCalls = 0;
  const context = vm.createContext({
    Promise, Error, String, Number, Math, Array, Map,
    setTimeout, clearTimeout,
    AUTOMATIC_DOWNLOAD_START_TIMEOUT_MS: 5,
    MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS: 4,
    DOWNLOADS_SEARCH_TIMEOUT_MS: 5,
    automaticDownloadStartSettlements: new Map(),
    chrome: {
      downloads: {
        download() {
          downloadCalls += 1;
          events.push('download-start');
          return downloadPromise;
        },
        search() { return Promise.resolve([]); }
      }
    },
    normalizePendingLocalDownloadKey(value) {
      return typeof value === 'string' && value.startsWith('intent:') ? value : null;
    },
    removePendingLocalDownload(key) {
      events.push(`remove:${key}`);
      return Promise.resolve();
    },
    revokeBlobUrl(url) {
      events.push(`revoke:${url}`);
      return Promise.resolve();
    },
    bindPendingLocalDownloadIntent(key, id) {
      events.push(`bind:${key}:${id}`);
      return Promise.resolve({ downloadId: id, blobUrl: 'blob:test' });
    },
    revokeBlobUrlWhenDownloadFinishes(id, url) {
      events.push(`watch:${id}:${url}`);
    },
    finalizePendingLocalDownload() { return Promise.resolve({ handled: false }); },
    normalizeError(error) { return error?.message || String(error); },
    recordOperationStage(_operationId, stage) { events.push(`stage:${stage}`); },
    flushOperationLogWrites() { return Promise.resolve(); },
    withOperationTimeout(promise, timeoutMs, label) {
      let timer;
      return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error(`${label} timeout`);
            error.code = 'WEBCLIP_TIMEOUT';
            reject(error);
          }, timeoutMs);
        })
      ]).finally(() => clearTimeout(timer));
    }
  });
  context.getDownloadCalls = () => downloadCalls;
  return context;
}

async function testTimeoutPreservesIntentUntilLateSuccess() {
  const events = [];
  const start = deferred();
  const context = createContext(start.promise, events);
  const code = section(sw, 'async function startAutomaticBlobDownloadBounded', 'async function finalizePendingLocalDownload');
  vm.runInContext(`${code}\nthis.startForTest = startAutomaticBlobDownloadBounded;`, context);

  const result = await context.startForTest({
    intentKey: 'intent:late-success',
    blobUrl: 'blob:test',
    filename: 'page.pdf',
    operationId: 'op-late-success'
  });

  assert.strictEqual(result.pending, true, 'local deadline must return a pending/unknown-settlement result');
  assert.strictEqual(context.getDownloadCalls(), 1, 'timeout must not auto-retry chrome.downloads.download');
  assert.strictEqual(events.some((event) => event.startsWith('remove:')), false, 'timeout must not delete durable intent');
  assert.strictEqual(events.some((event) => event.startsWith('revoke:')), false, 'timeout must not revoke Blob before actual settlement');
  assert.strictEqual(context.automaticDownloadStartSettlements.size, 1, 'late Chrome settlement must keep occupying the in-flight budget');

  start.resolve(42);
  await delay(15);

  assert(events.includes('bind:intent:late-success:42'), 'late success must bind the original durable intent to returned downloadId');
  assert(events.includes('watch:42:blob:test'), 'late success must install normal Blob lifecycle tracking');
  assert.strictEqual(events.filter((event) => event === 'download-start').length, 1, 'late success path must never start a duplicate download');
  assert.strictEqual(context.automaticDownloadStartSettlements.size, 0, 'in-flight slot is released only after actual settlement');
}

async function testLateFailureCleansOnlyAfterActualSettlement() {
  const events = [];
  const start = deferred();
  const context = createContext(start.promise, events);
  const code = section(sw, 'async function startAutomaticBlobDownloadBounded', 'async function finalizePendingLocalDownload');
  vm.runInContext(`${code}\nthis.startForTest = startAutomaticBlobDownloadBounded;`, context);

  const result = await context.startForTest({
    intentKey: 'intent:late-failure',
    blobUrl: 'blob:failure',
    filename: 'page.pdf',
    operationId: 'op-late-failure'
  });
  assert.strictEqual(result.pending, true);
  assert.strictEqual(events.includes('remove:intent:late-failure'), false);
  assert.strictEqual(events.includes('revoke:blob:failure'), false);

  start.reject(new Error('late Chrome rejection'));
  await delay(15);

  assert(events.includes('remove:intent:late-failure'), 'actual rejection must remove durable intent');
  assert(events.includes('revoke:blob:failure'), 'actual rejection must revoke unused Blob URL');
  assert(events.includes('stage:error'), 'late rejection after caller timeout must be visible in OperationLog');
  assert.strictEqual(context.automaticDownloadStartSettlements.size, 0);
}

async function testGlobalUnknownSettlementBudgetBlocksNewSideEffect() {
  const events = [];
  const never = new Promise(() => {});
  const context = createContext(never, events);
  const code = section(sw, 'async function startAutomaticBlobDownloadBounded', 'async function finalizePendingLocalDownload');
  vm.runInContext(`${code}\nthis.startForTest = startAutomaticBlobDownloadBounded;`, context);
  for (let i = 0; i < 4; i += 1) context.automaticDownloadStartSettlements.set(`intent:old-${i}`, never);

  await assert.rejects(
    context.startForTest({ intentKey: 'intent:new', blobUrl: 'blob:new', filename: 'page.pdf', operationId: 'op-new' }),
    (error) => error?.code === 'WEBCLIP_DOWNLOAD_START_BUSY'
  );
  assert.strictEqual(context.getDownloadCalls(), 0, 'budget exhaustion must fail before starting another Chrome side effect');
  assert(events.includes('remove:intent:new'), 'new not-started intent must be cleaned safely');
  assert(events.includes('revoke:blob:new'), 'new not-started Blob must be released safely');
}

function testAutomaticPdfCallSitesUseSettlementAwareHelper() {
  const generated = section(sw, 'async function generatePdfAndDownload', 'async function generatePdfAndUploadToYandex');
  const cached = section(sw, 'async function downloadCachedPdf', 'function normalizeJournalUrl');
  for (const [name, code] of [['generated', generated], ['cached', cached]]) {
    assert(code.includes('startAutomaticBlobDownloadBounded('), `${name} automatic PDF path must use P1-146 helper`);
    assert(!code.includes('chrome.downloads.download('), `${name} automatic PDF path must not directly await non-cancellable download start`);
    assert(code.includes('downloadStartPending'), `${name} path must surface unknown settlement without retrying`);
  }

  const helper = section(sw, 'async function startAutomaticBlobDownloadBounded', 'async function finalizePendingLocalDownload');
  assert(helper.includes('automaticDownloadStartSettlements.size >= MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS'), 'P1-146 must bound actually unresolved download starts');
  assert(helper.includes("error?.code !== 'WEBCLIP_TIMEOUT'"), 'local timeout must be distinguished from actual Chrome rejection');
  assert(helper.includes('return { pending: true'), 'local timeout must become explicit pending/unknown-settlement state');

  const downloadUi = section(content, 'async function downloadPdf', 'const PAGE_UPLOAD_STAGES');
  const cachedUi = section(content, 'async function downloadCachedPdfAfterYandexError', 'function showYandexSendError');
  assert(downloadUi.includes('result.downloadStartPending'), 'primary content UI must distinguish unknown download-start settlement');
  assert(cachedUi.includes('result.downloadStartPending'), 'cached-PDF UI must distinguish unknown download-start settlement');
  assert(/не повторяйте эту же операцию/i.test(downloadUi), 'UI must not encourage retry during unknown settlement');
}

(async () => {
  await testTimeoutPreservesIntentUntilLateSuccess();
  await testLateFailureCleansOnlyAfterActualSettlement();
  await testGlobalUnknownSettlementBudgetBlocksNewSideEffect();
  testAutomaticPdfCallSitesUseSettlementAwareHelper();
  console.log('PASS P1-146 automatic download start late-settlement reconciliation');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
