const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('offscreen.js', 'utf8');
assert.match(source, /MAX_ACTIVE_SIGNED_TRANSFERS\s*=\s*2/);
assert.match(source, /MAX_ACTIVE_SIGNED_TRANSFER_BYTES\s*=\s*96 \* 1024 \* 1024/);
assert.match(source, /reserveSignedTransferAdmission\(message\)/);
assert.match(source, /releaseSignedTransferAdmission\(reservation\)/);
assert.match(source, /handleSignedTransfer\(message, reservation\)/);
assert.match(source, /resizeSignedTransferReservation\(reservation, fetchOptions\.body\.size\)/);
assert.match(source, /caller-side runtime deadline/);

const timers = new Map();
let timerId = 0;
const context = {
  console,
  Blob,
  URL,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  AbortController,
  Date,
  Math,
  Promise,
  Error,
  setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
  clearTimeout(id) { timers.delete(id); },
  setInterval() { return ++timerId; },
  clearInterval() {},
  chrome: {
    runtime: {
      id: 'test-extension',
      getURL: () => 'chrome-extension://test-extension/',
      onMessage: { addListener() {} },
      sendMessage: async () => ({ closed: false })
    }
  },
  indexedDB: { open() { throw new Error('not used'); } },
  atob() { throw new Error('not used'); }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source + String.fromCharCode(10) + ';globalThis.__p0063 = { reserveSignedTransferAdmission, resizeSignedTransferReservation, releaseSignedTransferAdmission, getSignedTransferAdmissionBytes, state: () => ({ activeTransfers, activeSignedTransferBytes, reservations: activeSignedTransferReservations.size }) };', context);
const api = context.__p0063;

const MiB = 1024 * 1024;
const download50 = { spec: { mode: 'text-download', maxChars: 50 * MiB } };
const r1 = api.reserveSignedTransferAdmission(download50);
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.state())), { activeTransfers: 1, activeSignedTransferBytes: 50 * MiB, reservations: 1 });
assert.throws(() => api.reserveSignedTransferAdmission(download50), (error) => error && error.code === 'OFFSCREEN_TRANSFER_BUDGET_EXCEEDED');
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.state())), { activeTransfers: 1, activeSignedTransferBytes: 50 * MiB, reservations: 1 });

api.resizeSignedTransferReservation(r1, 8 * MiB);
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.state())), { activeTransfers: 1, activeSignedTransferBytes: 8 * MiB, reservations: 1 });
const r2 = api.reserveSignedTransferAdmission({ spec: { mode: 'pdf-cache-upload' } });
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.state())), { activeTransfers: 2, activeSignedTransferBytes: 56 * MiB, reservations: 2 });
assert.throws(() => api.reserveSignedTransferAdmission({ spec: { mode: 'text-payload-upload' } }), (error) => error && error.code === 'OFFSCREEN_TRANSFER_BUDGET_EXCEEDED');

api.releaseSignedTransferAdmission(r1);
api.releaseSignedTransferAdmission(r1); // idempotent actual-settlement release
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.state())), { activeTransfers: 1, activeSignedTransferBytes: 48 * MiB, reservations: 1 });
api.releaseSignedTransferAdmission(r2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.state())), { activeTransfers: 0, activeSignedTransferBytes: 0, reservations: 0 });

console.log('P0-063 offscreen signed-transfer admission budget: PASS');
