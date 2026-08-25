const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const options = fs.readFileSync(path.join(root, 'options.js'), 'utf8');
const journalHtml = fs.readFileSync(path.join(root, 'journal.html'), 'utf8');
const optionsHtml = fs.readFileSync(path.join(root, 'options.html'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'prepared-save-as.js'), 'utf8');

assert(!sw.includes('saveAs: true'), 'service worker must not own native Save As after P1-079/P1-080');
assert(sw.includes('async function prepareFullJournalExport('));
assert(sw.includes('async function prepareOperationLogExport('));
assert(journal.includes("type: 'WEBCLIP_JOURNAL_EXPORT_PREPARE'"));
assert(options.includes("type: 'WEBCLIP_OPERATION_LOG_EXPORT_PREPARE'"));
assert(journal.includes('WebClipPreparedSaveAs.start(prepared)'));
assert(options.includes('WebClipPreparedSaveAs.start(prepared)'));
assert(journalHtml.indexOf('prepared-save-as.js') < journalHtml.indexOf('journal.js'));
assert(optionsHtml.indexOf('prepared-save-as.js') < optionsHtml.indexOf('options.js'));
assert(helper.includes('saveAs: true'));
assert(!/Promise\.race\s*\(/.test(helper), 'native Save As invocation must not use a caller timeout race');
assert(!/setTimeout\s*\(/.test(helper), 'native Save As owner helper must not invent a timeout for user dialog latency');

function makeContext(downloadImpl) {
  const messages = [];
  const listeners = new Set();
  const downloads = [];
  const context = vm.createContext({
    Error, String, Number, Promise, Object, globalThis: null,
    chrome: {
      runtime: {
        getURL(value = '') { return `chrome-extension://test-id/${value}`; },
        sendMessage(message) { messages.push({ ...message }); return Promise.resolve({ ok: true }); }
      },
      downloads: {
        download(options) { downloads.push({ ...options }); return downloadImpl(options); },
        onChanged: {
          addListener(fn) { listeners.add(fn); },
          removeListener(fn) { listeners.delete(fn); }
        }
      }
    }
  });
  context.globalThis = context;
  vm.runInContext(helper, context);
  return { context, messages, listeners, downloads };
}

async function testPendingDialogHasSingleOwnerCall() {
  let resolveDownload;
  const pending = new Promise((resolve) => { resolveDownload = resolve; });
  const env = makeContext(() => pending);
  const startPromise = env.context.WebClipPreparedSaveAs.start({
    blobUrl: 'blob:chrome-extension://test-id/abc',
    filename: 'Journal.json'
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(env.downloads.length, 1, 'native dialog must be invoked exactly once');
  assert.strictEqual(env.downloads[0].saveAs, true);
  assert.strictEqual(env.messages.length, 0, 'pending user dialog must not be timed out/retried/released');
  resolveDownload(41);
  assert.strictEqual(await startPromise, 41);
  assert(env.messages.some((m) => m.type === 'WEBCLIP_PREPARED_SAVE_AS_STARTED' && m.downloadId === 41));
  assert.strictEqual(env.listeners.size, 1, 'page must own terminal cleanup listener');
  for (const listener of [...env.listeners]) listener({ id: 41, state: { current: 'complete' } });
  await new Promise((resolve) => setImmediate(resolve));
  assert(env.messages.some((m) => m.type === 'WEBCLIP_PREPARED_SAVE_AS_RELEASE'));
  assert.strictEqual(env.listeners.size, 0);
}

async function testDialogFailureReleasesBlobWithoutRetry() {
  const error = new Error('User canceled');
  const env = makeContext(() => Promise.reject(error));
  await assert.rejects(
    env.context.WebClipPreparedSaveAs.start({
      blobUrl: 'blob:chrome-extension://test-id/cancel',
      filename: 'Operation.json'
    }),
    /User canceled/
  );
  assert.strictEqual(env.downloads.length, 1, 'cancel/failure must not retry native Save As');
  const releases = env.messages.filter((m) => m.type === 'WEBCLIP_PREPARED_SAVE_AS_RELEASE');
  assert.strictEqual(releases.length, 1, 'failed Save As must release prepared Blob exactly once');
}

async function testRejectsForeignBlobBeforeChromeSideEffect() {
  const env = makeContext(() => Promise.resolve(9));
  await assert.rejects(
    env.context.WebClipPreparedSaveAs.start({ blobUrl: 'blob:https://evil.example/x', filename: 'x.json' }),
    /некорректный временный файл/
  );
  assert.strictEqual(env.downloads.length, 0);
}

(async () => {
  await testPendingDialogHasSingleOwnerCall();
  await testDialogFailureReleasesBlobWithoutRetry();
  await testRejectsForeignBlobBeforeChromeSideEffect();
  console.log('PASS P1-079/P1-080 page-owned native Save As');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
