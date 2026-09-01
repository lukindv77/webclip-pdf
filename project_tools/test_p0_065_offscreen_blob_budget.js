'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'offscreen-blob-budget-guard.js'), 'utf8');

function makeContext() {
  let nativeConstructions = 0;
  let nextUrl = 1;
  const revoked = [];
  const fetchResolvers = [];
  function NativeBlob(parts = []) {
    nativeConstructions += 1;
    let size = 0;
    for (const part of parts || []) {
      if (part instanceof NativeBlob) size += part.size;
      else if (typeof part === 'string') size += Buffer.byteLength(part);
      else size += Number(part?.byteLength || 0);
    }
    this.size = size;
    this.type = '';
  }
  const context = {
    Blob: NativeBlob,
    ArrayBuffer,
    Buffer,
    Promise,
    Reflect,
    Object,
    Math,
    Number,
    String,
    TypeError,
    Error,
    WeakMap,
    Map,
    setTimeout,
    clearTimeout,
    URL: {
      createObjectURL() { return `blob:test-${nextUrl++}`; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    fetch() {
      return new Promise((resolve) => fetchResolvers.push(resolve));
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'offscreen-blob-budget-guard.js' });
  return { context, getNativeConstructions: () => nativeConstructions, fetchResolvers, revoked };
}

(async () => {
  const { context, getNativeConstructions, fetchResolvers, revoked } = makeContext();
  const guard = context.WebClipOffscreenBlobBudgetGuard;
  assert.ok(guard);
  assert.equal(guard.utf8LengthBounded('abc', 100), 3);
  assert.equal(guard.utf8LengthBounded('Ж', 100), 2);
  assert.equal(guard.utf8LengthBounded('😀', 100), 4);

  const beforeReject = getNativeConstructions();
  assert.throws(
    () => new context.Blob(['x'.repeat(guard.MAX_SINGLE_BLOB_BYTES + 1)]),
    (error) => error?.code === guard.ERROR_CODE && error?.reason === 'single-bytes'
  );
  assert.equal(getNativeConstructions(), beforeReject, 'single-byte overflow must reject before native Blob allocation');

  const reservations = [];
  for (let index = 0; index < guard.MAX_ACTIVE_BLOB_MATERIALIZATIONS; index += 1) {
    reservations.push(guard.reserveBytes(guard.TRACK_THRESHOLD_BYTES, 'test'));
  }
  assert.throws(
    () => guard.reserveBytes(guard.TRACK_THRESHOLD_BYTES, 'overflow'),
    (error) => error?.code === guard.ERROR_CODE && error?.reason === 'count'
  );
  reservations.forEach(guard.releaseReservation);
  assert.equal(guard.stats.activeCount, 0);
  assert.equal(guard.stats.activeBytes, 0);

  const large = new context.Blob(['a'.repeat(guard.TRACK_THRESHOLD_BYTES + 10)]);
  assert.ok(large instanceof context.Blob, 'native Blob compatibility must survive constructor interception');
  assert.equal(guard.stats.activeCount, 1);
  const url = context.URL.createObjectURL(large);
  assert.equal(guard.stats.activeCount, 1, 'ObjectURL adoption must retain constructor reservation');
  context.URL.revokeObjectURL(url);
  assert.equal(guard.stats.activeCount, 0, 'revoke must release ObjectURL materialization reservation');
  assert.deepEqual(revoked, [url]);

  const upload = new context.Blob(['b'.repeat(guard.TRACK_THRESHOLD_BYTES + 20)]);
  const fetchPromise = context.fetch('https://disk.yandex.net/upload', { method: 'PUT', body: upload });
  assert.equal(guard.stats.activeCount, 1, 'fetch adoption must retain materialization reservation until actual settlement');
  fetchResolvers.shift()({ ok: true });
  await fetchPromise;
  assert.equal(guard.stats.activeCount, 0, 'fetch settlement must release materialization reservation');

  const nativeExisting = Reflect.construct(Object.getPrototypeOf(context.Blob), [['c'.repeat(guard.TRACK_THRESHOLD_BYTES + 30)]], Object.getPrototypeOf(context.Blob));
  const existingUrl = context.URL.createObjectURL(nativeExisting);
  assert.equal(guard.stats.activeCount, 1, 'large pre-existing native Blob must be admitted before ObjectURL ownership');
  context.URL.revokeObjectURL(existingUrl);
  assert.equal(guard.stats.activeCount, 0);

  const html = fs.readFileSync(path.join(ROOT, 'offscreen.html'), 'utf8');
  assert.ok(html.indexOf('offscreen-blob-budget-guard.js') < html.indexOf('offscreen.js'), 'P0-065 guard must bootstrap before offscreen runtime');
  const offscreen = fs.readFileSync(path.join(ROOT, 'offscreen.js'), 'utf8');
  assert.match(offscreen, /registerBlobUrl\(blob\)/, 'existing Blob URL ledger remains second-line admission');
  assert.match(offscreen, /reserveSignedTransferAdmission\(message\)/, 'existing signed-transfer reservation remains independent');

  console.log('P0-065 offscreen Blob pre-allocation admission: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
