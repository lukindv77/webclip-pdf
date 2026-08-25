const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'offscreen.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const helpers = section(source, 'function boundedIdbPhaseTimeout', 'async function getPdfCacheRecord');
  const context = vm.createContext({ console, Promise, Error, Number, Math, Date, setTimeout, clearTimeout, String });
  vm.runInContext(`${helpers}\nthis.phaseTimeout = boundedIdbPhaseTimeout; this.guardTx = timeoutIdbTransaction;`, context);

  assert.throws(
    () => context.phaseTimeout(Date.now() - 1, 10000, 'test'),
    (error) => error && error.code === 'OFFSCREEN_IDB_TIMEOUT'
  );

  let aborted = false;
  const tx = { abort() { aborted = true; } };
  const rejection = new Promise((resolve, reject) => {
    context.guardTx(tx, reject, 5, 'hung transaction');
  });
  await assert.rejects(rejection, (error) => error && error.code === 'OFFSCREEN_IDB_TIMEOUT');
  await delay(1);
  assert.strictEqual(aborted, true, 'timed-out IndexedDB transaction must be aborted');

  assert(source.includes('const fail = (error) => {') && source.includes('try { tx.abort(); } catch (_) {}'),
    'chunk semantic failure must abort the remaining IndexedDB transaction');
  for (const marker of [
    'fail(new Error(`Не найден chunk ${index + 1}/${chunkCount} временного экспорта.`))',
    'fail(new Error(`Chunk ${index + 1}/${chunkCount} превышает безопасный byte-limit.`))',
    "fail(new Error('Chunked transfer превышает безопасный общий byte-limit.'))"
  ]) {
    assert(source.includes(marker), `chunk validation must use aborting fail path: ${marker}`);
  }

  for (const expected of [
    "getPdfCacheRecord(String(spec.pdfCacheKey || ''), deadlineAt)",
    "getTransferPayload(String(spec.payloadKey || ''), deadlineAt)",
    "getTransferChunkedBlob(String(spec.payloadKey || ''), fetchOptions.headers['Content-Type'], deadlineAt)",
    "stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt)"
  ]) {
    assert(source.includes(expected), `signed transfer must propagate the common deadline: ${expected}`);
  }

  assert(source.includes('await putTransferRecord({') && source.includes('}, deadlineAt);'), 'streamed journal chunks must use the shared deadline for IndexedDB writes');
  console.log('Offscreen IndexedDB deadline tests OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
