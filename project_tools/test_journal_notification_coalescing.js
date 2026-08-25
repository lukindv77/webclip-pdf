const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journalSource = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const start = source.indexOf('let journalRevisionWriteInFlight');
const end = source.indexOf('let journalStatsMarkerSettlementChain', start);
if (start < 0 || end < 0) throw new Error('journal notification block not found');
const code = source.slice(start, end);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
async function tick() { await Promise.resolve(); await new Promise((resolve) => setImmediate(resolve)); }

(async () => {
  assert(journalSource.includes("scheduleJournalReload(40, { preserveScroll: true })"), 'live journal notifications must reload without waiting for the storage revision marker');
  const storageCalls = [];
  const messageCalls = [];
  const chrome = {
    storage: { local: { set(value) { const d = deferred(); storageCalls.push({ value, d }); return d.promise; } } },
    runtime: { sendMessage(value) { const d = deferred(); messageCalls.push({ value, d }); return d.promise; } }
  };
  let now = 1000;
  const FakeDate = class extends Date { static now() { return ++now; } };
  const context = vm.createContext({ chrome, Promise, Error, String, Math, Date: FakeDate, console });
  vm.runInContext(`${code}\nthis.notifyForTest = notifyJournalChanged;`, context);

  context.notifyForTest('one');
  context.notifyForTest('two');
  context.notifyForTest('three');
  assert.strictEqual(storageCalls.length, 1, 'only one storage revision write may be in flight');
  assert.strictEqual(messageCalls.length, 1, 'only one runtime notification may be in flight');
  assert.strictEqual(storageCalls[0].value.webclipJournalRevision.reason, 'one');

  storageCalls[0].d.resolve();
  messageCalls[0].d.resolve();
  await tick();
  assert.strictEqual(storageCalls.length, 2, 'settlement should drain exactly the coalesced latest revision');
  assert.strictEqual(messageCalls.length, 2, 'settlement should drain exactly the coalesced latest notification');
  assert.strictEqual(storageCalls[1].value.webclipJournalRevision.reason, 'three');
  assert.strictEqual(messageCalls[1].value.reason, 'three');

  context.notifyForTest('four');
  context.notifyForTest('five');
  assert.strictEqual(storageCalls.length, 2, 'a second in-flight write must continue to bound the queue');
  storageCalls[1].d.resolve();
  messageCalls[1].d.resolve();
  await tick();
  assert.strictEqual(storageCalls.length, 3);
  assert.strictEqual(storageCalls[2].value.webclipJournalRevision.reason, 'five');
  assert.strictEqual(messageCalls[2].value.reason, 'five');

  storageCalls[2].d.resolve();
  messageCalls[2].d.resolve();
  await tick();
  assert.strictEqual(storageCalls.length, 3, 'drain must stop once the pending slot is empty');

  console.log('Journal change notification coalescing tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
