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

async function testStorageAccessDeadlineAndFailClosedGate() {
  let localCalls = 0;
  let sessionCalls = 0;
  const chrome = {
    storage: {
      local: {
        setAccessLevel() {
          localCalls += 1;
          return new Promise(() => {});
        }
      },
      session: {
        setAccessLevel() {
          sessionCalls += 1;
          return Promise.resolve();
        }
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Math,
    setTimeout: fastTimer,
    clearTimeout,
    STORAGE_ACCESS_LEVEL_TIMEOUT_MS: 10_000,
    normalizeError: (error) => error?.message || String(error)
  });
  const code = section(swSource, 'function withStartupSecurityDeadline', 'function makeOperationLogId');
  vm.runInContext(`${code}\nthis.ensureStorageAccessForTest = ensureStorageAccessInitialized;`, context);

  await assert.rejects(
    context.ensureStorageAccessForTest(),
    (error) => error && error.code === 'WEBCLIP_SECURITY_INIT_TIMEOUT'
  );
  assert.strictEqual(localCalls, 1, 'local access boundary must be attempted exactly once');
  assert.strictEqual(sessionCalls, 0, 'security initialization must stop fail-closed after local boundary timeout');

  const handlerStart = swSource.indexOf('const asyncHandler = async () => {');
  const handlerGate = swSource.indexOf('await ensureStorageAccessInitialized();', handlerStart);
  const senderCheck = swSource.indexOf('const senderKind = assertRuntimeMessageSender', handlerStart);
  assert(handlerStart >= 0 && handlerGate > handlerStart && senderCheck > handlerGate,
    'runtime message processing must await the storage access boundary before sender/command handling');

  const injectStart = swSource.indexOf('async function ensureWebClipContentScript');
  const injectEnd = swSource.indexOf('async function sendWebClipPageCommand', injectStart);
  const injectCode = swSource.slice(injectStart, injectEnd);
  assert(injectCode.includes('await ensureStorageAccessInitialized();'),
    'content-script injection must await the storage access boundary');
}

async function testOffscreenContextProbeFailureIsNotClosed() {
  let cancelCalls = 0;
  const chrome = {
    runtime: {
      getURL: (value) => `chrome-extension://test/${value}`,
      sendMessage(message) {
        if (message.type === 'WEBCLIP_OFFSCREEN_CONFIRM_IDLE_CLOSE') return Promise.resolve({ ok: true, idle: true });
        if (message.type === 'WEBCLIP_OFFSCREEN_CANCEL_IDLE_CLOSE') {
          cancelCalls += 1;
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      },
      getContexts() {
        return Promise.reject(new Error('context probe failed'));
      }
    },
    offscreen: {
      closeDocument() { return Promise.reject(new Error('close failed')); },
      createDocument() { return Promise.resolve(); }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    setTimeout: fastTimer,
    clearTimeout,
    OFFSCREEN_DOCUMENT_PATH: 'offscreen.html',
    normalizeError: (error) => error?.message || String(error),
    closingOffscreenDocument: null,
    creatingOffscreenDocument: null
  });
  const timeoutCode = section(swSource, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const offscreenCode = section(swSource, 'async function closeOffscreenDocumentIfIdle', 'async function sendMessageToOffscreen');
  vm.runInContext(`${timeoutCode}\n${offscreenCode}\nthis.closeForTest = closeOffscreenDocumentIfIdle;`, context);

  const result = await context.closeForTest(7);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.closed, false, 'failed context probe must never be treated as proof that offscreen is closed');
  assert.strictEqual(result.reason, 'context-unknown');
  assert(cancelCalls >= 1, 'a rejected close must best-effort reset the offscreen idle-close latch');
}

function testDownloadsSearchCallsAreBounded() {
  const matches = [...swSource.matchAll(/chrome\.downloads\.search\(/g)];
  assert(matches.length >= 5, 'expected all known downloads.search call sites to remain present');
  for (const match of matches) {
    const start = Math.max(0, match.index - 120);
    const prefix = swSource.slice(start, match.index);
    assert(prefix.includes('withOperationTimeout('),
      `downloads.search call at source offset ${match.index} must be bounded by withOperationTimeout`);
  }
}

(async () => {
  await testStorageAccessDeadlineAndFailClosedGate();
  await testOffscreenContextProbeFailureIsNotClosed();
  testDownloadsSearchCallsAreBounded();
  console.log('PASS recovered history gaps: P1-078/P1-088/P1-104/P1-105');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
