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

function createContext({ maxBytes = 48 * 1024 * 1024, reads }) {
  const events = [];
  let readIndex = 0;
  const debuggerListeners = new Set();
  const chrome = {
    debugger: {
      onEvent: {
        addListener(listener) { debuggerListeners.add(listener); events.push('onEvent.addListener'); },
        removeListener(listener) { debuggerListeners.delete(listener); events.push('onEvent.removeListener'); }
      },
      attach() { events.push('attach'); return Promise.resolve(); },
      detach() { events.push('detach'); return Promise.resolve(); },
      sendCommand(_debuggee, method, params) {
        events.push(method);
        if (method === 'Page.getFrameTree') {
          return Promise.resolve({ frameTree: { frame: { id: `main-${_debuggee.tabId}`, loaderId: `loader-${_debuggee.tabId}` } } });
        }
        if (method === 'Page.printToPDF') {
          assert.strictEqual(params.transferMode, 'ReturnAsStream');
          return Promise.resolve({ stream: 'stream-1' });
        }
        if (method === 'IO.read') {
          assert.strictEqual(params.handle, 'stream-1');
          assert(params.size > 0);
          return Promise.resolve(reads[readIndex++] || { data: '', base64Encoded: true, eof: true });
        }
        if (method === 'IO.close') {
          assert.strictEqual(params.handle, 'stream-1');
          return Promise.resolve({});
        }
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
    setTimeout,
    clearTimeout,
    DEBUGGER_COMMAND_TIMEOUT_MS: 60_000,
    MAX_PDF_BYTES: maxBytes,
    PDF_STREAM_READ_CHUNK_BYTES: 1024 * 1024,
    normalizeError: (error) => error?.message || String(error)
  });
  const code = section(swSource, 'function withOperationTimeout', 'async function removeLegacyPersistentYandexAuth');
  vm.runInContext(`${code}\nthis.generatePdfBlobForTest = generatePdfBlob;`, context);
  return { context, events };
}

async function testStreamingSuccess() {
  const { context, events } = createContext({
    reads: [
      { data: 'YWJj', base64Encoded: true, eof: false },
      { data: 'ZGU=', base64Encoded: true, eof: true }
    ]
  });
  const blob = await context.generatePdfBlobForTest(42);
  assert(blob instanceof Blob);
  assert.strictEqual(blob.size, 5);
  assert.strictEqual(Buffer.from(await blob.arrayBuffer()).toString('utf8'), 'abcde');
  assert.strictEqual(events.filter((x) => x === 'IO.read').length, 2);
  assert(events.includes('IO.close'), 'stream handle must be closed on success');
  assert(events.includes('Page.getFrameTree'), 'PDF render must identify the exact main frame');
  assert(events.includes('onEvent.addListener'), 'PDF render must install the navigation fence');
  assert(events.includes('onEvent.removeListener'), 'PDF render must remove the navigation fence');
  assert(events.indexOf('IO.close') < events.lastIndexOf('detach'), 'IO.close must happen before debugger detach');
}

async function testByteBudgetStillClosesStream() {
  const { context, events } = createContext({
    maxBytes: 3,
    reads: [{ data: 'YWJjZA==', base64Encoded: true, eof: true }]
  });
  await assert.rejects(
    context.generatePdfBlobForTest(43),
    (error) => error && error.code === 'PDF_TOO_LARGE'
  );
  assert(events.includes('IO.close'), 'stream handle must be closed after byte-budget failure');
  assert(events.includes('detach'), 'debugger must be detached after byte-budget failure');
}

async function testUnexpectedEncodingFailsClosed() {
  const { context, events } = createContext({
    reads: [{ data: '%PDF-binary', base64Encoded: false, eof: true }]
  });
  await assert.rejects(
    context.generatePdfBlobForTest(44),
    (error) => error && error.code === 'PDF_STREAM_ENCODING_UNEXPECTED'
  );
  assert(events.includes('IO.close'));
}

(async () => {
  assert(!swSource.includes("transferMode: 'ReturnAsBase64'"), 'production PDF path must not request ReturnAsBase64');
  await testStreamingSuccess();
  await testByteBudgetStillClosesStream();
  await testUnexpectedEncodingFailsClosed();
  console.log('PASS P1-093 streaming PDF');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
