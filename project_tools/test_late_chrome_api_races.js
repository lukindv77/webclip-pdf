const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

function fastTimer(fn, ms, ...args) {
  return setTimeout(fn, Math.min(Number(ms) || 0, 3), ...args);
}

function offscreenRaceTimer(fn, ms, ...args) {
  const requested = Number(ms) || 0;
  // Keep local deadlines short. The underlying close promise in the race test
  // is manually settled, so timeout-vs-close ordering never depends on wall clock.
  return setTimeout(fn, requested >= 1000 ? 3 : Math.min(requested, 30), ...args);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function testLateDebuggerAttachIsReconciled() {
  const events = [];
  let attachCount = 0;
  let firstAttempt = true;
  const chrome = {
    debugger: {
      onEvent: {
        addListener() {},
        removeListener() {}
      },
      attach() {
        attachCount += 1;
        if (firstAttempt) {
          firstAttempt = false;
          return new Promise((resolve) => setTimeout(() => {
            events.push('late-attach-resolved');
            resolve();
          }, 80));
        }
        events.push('attach-resolved');
        return Promise.resolve();
      },
      detach() {
        events.push('detach');
        return Promise.resolve();
      },
      sendCommand(_debuggee, method) {
        if (method === 'Page.getFrameTree') {
          return Promise.resolve({ frameTree: { frame: { id: 'main-77', loaderId: 'loader-77' } } });
        }
        if (method === 'Page.printToPDF') return Promise.resolve({ stream: 'pdf-stream' });
        if (method === 'IO.read') return Promise.resolve({ data: 'YQ==', base64Encoded: true, eof: true });
        if (method === 'IO.close') { events.push('io-close'); return Promise.resolve({}); }
        return Promise.resolve({});
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    Set,
    Map,
    Blob,
    Uint8Array,
    atob,
    Date,
    setTimeout: fastTimer,
    clearTimeout,
    DEBUGGER_COMMAND_TIMEOUT_MS: 60_000,
    MAX_PDF_BYTES: 48 * 1024 * 1024,
    PDF_STREAM_READ_CHUNK_BYTES: 1024 * 1024,
    normalizeError: (error) => error?.message || String(error)
  });
  const code = section(swSource, 'function withOperationTimeout', 'async function readYandexAuthState');
  vm.runInContext(`${code}\nthis.generatePdfBlobForTest = generatePdfBlob;`, context);

  await assert.rejects(
    context.generatePdfBlobForTest(77),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  await assert.rejects(
    context.generatePdfBlobForTest(77),
    (error) => error && error.code === 'WEBCLIP_DEBUGGER_BUSY'
  );
  assert.strictEqual(attachCount, 1, 'retry must not start another attach while the timed-out attach is unresolved');

  await delay(100);
  assert(events.includes('late-attach-resolved'), 'the original attach should settle late in the test');
  assert(events.includes('detach'), 'late successful attach must be detached');

  const result = await context.generatePdfBlobForTest(77);
  assert(result instanceof Blob, 'streaming PDF path must return a Blob');
  assert.strictEqual(result.size, 1);
  assert(events.includes('io-close'), 'PDF stream handle must be explicitly closed');
  assert.strictEqual(attachCount, 2, 'a new attach is allowed only after late cleanup settles');
}

async function testLateOffscreenCloseBlocksRecreate() {
  const events = [];
  let createCount = 0;
  let offscreenPresent = true;
  let resolveClose = null;
  const chrome = {
    runtime: {
      getURL: (value) => `chrome-extension://test/${value}`,
      sendMessage(message) {
        if (message.type === 'WEBCLIP_OFFSCREEN_CONFIRM_IDLE_CLOSE') return Promise.resolve({ ok: true, idle: true });
        if (message.type === 'WEBCLIP_OFFSCREEN_CANCEL_IDLE_CLOSE') {
          events.push('cancel-idle-close');
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      },
      getContexts() {
        return Promise.resolve(offscreenPresent ? [{ contextType: 'OFFSCREEN_DOCUMENT' }] : []);
      }
    },
    offscreen: {
      closeDocument() {
        events.push('close-started');
        return new Promise((resolve) => {
          resolveClose = () => {
            offscreenPresent = false;
            events.push('late-close-resolved');
            resolve();
          };
        });
      },
      createDocument() {
        createCount += 1;
        offscreenPresent = true;
        events.push('create');
        return Promise.resolve();
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    setTimeout: offscreenRaceTimer,
    clearTimeout,
    OFFSCREEN_DOCUMENT_PATH: 'offscreen.html',
    normalizeError: (error) => error?.message || String(error),
    closingOffscreenDocument: null,
    creatingOffscreenDocument: null
  });
  const timeoutCode = section(swSource, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const offscreenCode = section(swSource, 'async function closeOffscreenDocumentIfIdle', 'async function sendMessageToOffscreen');
  vm.runInContext(`${timeoutCode}\n${offscreenCode}\nthis.closeForTest = closeOffscreenDocumentIfIdle; this.ensureForTest = ensureOffscreenDocument;`, context);

  const closeResult = await context.closeForTest(1);
  assert.strictEqual(closeResult.reason, 'close-pending');
  assert.strictEqual(typeof resolveClose, 'function', 'test must hold the exact unresolved closeDocument settlement');
  assert(events.includes('close-started'));

  await assert.rejects(
    context.ensureForTest(),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  assert.strictEqual(createCount, 0, 'must not recreate offscreen while the original closeDocument promise is unresolved');
  assert(!events.includes('late-close-resolved'), 'close must remain unresolved until the test explicitly settles it');

  resolveClose();
  await Promise.resolve();
  await Promise.resolve();
  assert(events.includes('late-close-resolved'));
  await context.ensureForTest();
  assert.strictEqual(createCount, 1, 'offscreen can be recreated after the original close settles');
}

async function testBlobDeadlineCancelsBeforeRevoke() {
  const events = [];
  const listeners = new Set();
  const chrome = {
    downloads: {
      onChanged: {
        addListener(fn) { listeners.add(fn); },
        removeListener(fn) { listeners.delete(fn); }
      },
      search() { return Promise.resolve([{ id: 5, state: 'in_progress' }]); },
      cancel() {
        events.push('cancel-start');
        return new Promise((resolve) => setTimeout(() => {
          events.push('cancel-finished');
          resolve();
        }, 1));
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    Map,
    Array,
    setTimeout,
    clearTimeout,
    LOCAL_BLOB_DOWNLOAD_DEADLINE_MS: 5,
    revokeBlobUrl: (url) => {
      events.push(`revoke:${url}`);
      return Promise.resolve();
    }
  });
  const timeoutCode = section(swSource, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const blobCode = section(swSource, 'const downloadBlobCleanupWatchdogs', 'function getSiteNameUpToThirdLevel');
  vm.runInContext(`${timeoutCode}\n${blobCode}\nthis.revokeWhenDoneForTest = revokeBlobUrlWhenDownloadFinishes;`, context);

  context.revokeWhenDoneForTest(5, 'blob:test');
  const waitDeadline = Date.now() + 500;
  while (!events.includes('cancel-finished') && Date.now() < waitDeadline) {
    await delay(10);
  }
  const cancelFinished = events.indexOf('cancel-finished');
  const revoked = events.indexOf('revoke:blob:test');
  assert(cancelFinished >= 0, 'active download should be cancelled at the explicit deadline');
  assert(revoked > cancelFinished, 'Blob URL must be revoked only after Chrome cancel settles');
  assert.strictEqual(listeners.size, 0, 'download listener must be removed during cleanup');
}

async function testBlobDeadlineCancelsWhenStateQueryFails() {
  const events = [];
  const listeners = new Set();
  const chrome = {
    downloads: {
      onChanged: {
        addListener(fn) { listeners.add(fn); },
        removeListener(fn) { listeners.delete(fn); }
      },
      search() { return Promise.reject(new Error('downloads.search unavailable')); },
      cancel() {
        events.push('cancel');
        return Promise.resolve();
      }
    }
  };
  const context = vm.createContext({
    chrome, console, Promise, Error, Number, Math, Map, Array,
    setTimeout, clearTimeout, LOCAL_BLOB_DOWNLOAD_DEADLINE_MS: 5,
    revokeBlobUrl: (url) => { events.push(`revoke:${url}`); return Promise.resolve(); }
  });
  const timeoutCode = section(swSource, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const blobCode = section(swSource, 'const downloadBlobCleanupWatchdogs', 'function getSiteNameUpToThirdLevel');
  vm.runInContext(`${timeoutCode}\n${blobCode}\nthis.revokeWhenDoneForTest = revokeBlobUrlWhenDownloadFinishes;`, context);

  context.revokeWhenDoneForTest(6, 'blob:unknown-state');
  await delay(20);
  assert(events.includes('cancel'), 'unknown download state must still trigger best-effort cancel before release');
  assert(events.indexOf('revoke:blob:unknown-state') > events.indexOf('cancel'), 'unknown-state Blob must be released only after cancel attempt');
  assert.strictEqual(listeners.size, 0);
}

async function testBlobCreationTransportErrorIsNotRetried() {
  let sends = 0;
  const chrome = {
    runtime: {
      sendMessage() {
        sends += 1;
        return Promise.reject(new Error('response channel lost after possible side effect'));
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    String,
    setTimeout,
    clearTimeout,
    ensureOffscreenDocument: async () => {}
  });
  const timeoutCode = section(swSource, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const helperCode = section(swSource, 'async function sendMessageToOffscreen', 'async function revokeBlobUrl');
  vm.runInContext(`${timeoutCode}\n${helperCode}\nthis.createTextForTest = createTextBlobUrl;`, context);

  await assert.rejects(context.createTextForTest('test'));
  assert.strictEqual(sends, 1, 'non-idempotent Blob creation RPC must not auto-retry an unknown transport failure');
}

(async () => {
  await testLateDebuggerAttachIsReconciled();
  await testLateOffscreenCloseBlocksRecreate();
  await testBlobDeadlineCancelsBeforeRevoke();
  await testBlobDeadlineCancelsWhenStateQueryFails();
  await testBlobCreationTransportErrorIsNotRetried();
  console.log('Late Chrome API race tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
