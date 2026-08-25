const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

const controls = {
  importFileButton: { disabled: false },
  importYandexButton: { disabled: false },
  clearSiteButton: { disabled: false },
  clearAllButton: { disabled: false }
};
const messages = [];
const context = vm.createContext({
  Boolean, String,
  journalDestructiveOperationInFlight: '',
  ...controls,
  setStatus(message, kind) { messages.push({ message, kind }); }
});
const code = section(source, 'function setJournalDestructiveControlsDisabled', 'async function exportJournalToFile');
vm.runInContext(`${code}\nthis.beginForTest = beginJournalDestructiveOperation; this.endForTest = endJournalDestructiveOperation;`, context);

assert.strictEqual(context.beginForTest('Импорт A'), true);
for (const control of Object.values(controls)) assert.strictEqual(control.disabled, true, 'all destructive controls must be disabled');
assert.strictEqual(context.beginForTest('Очистка B'), false, 'second destructive flow must be rejected while first is active');
assert(messages.at(-1).message.includes('Импорт A'));
context.endForTest();
for (const control of Object.values(controls)) assert.strictEqual(control.disabled, false, 'controls must be restored in finally');
assert.strictEqual(context.beginForTest('Очистка B'), true, 'new operation may start after prior one releases the gate');
context.endForTest();

assert(source.includes("beginJournalDestructiveOperation('Импорт журнала из файла')"));
assert(source.includes("beginJournalDestructiveOperation('Восстановление журнала с Яндекс Диска')"));
assert(source.includes("beginJournalDestructiveOperation('Очистка журнала домена')"));
assert(source.includes("beginJournalDestructiveOperation('Очистка всего журнала')"));
const releaseCount = (source.match(/endJournalDestructiveOperation\(\);/g) || []).length;
assert(releaseCount >= 4, 'every destructive flow must release the gate in finally');

console.log('Journal destructive-operation gate tests OK');

// Service-worker boundary must also reject a concurrent destructive command
// coming from another journal tab.
{
  const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const swCode = section(sw, 'let journalDestructiveMutationInFlight', 'chrome.runtime.onMessage.addListener');
  const pending = deferredForSw();
  const swContext = vm.createContext({ String, Error, Promise, journalDestructiveMutationInFlight: '' });
  vm.runInContext(`${swCode}\nthis.runExclusiveForTest = runExclusiveJournalDestructiveMutation;`, swContext);
  const first = swContext.runExclusiveForTest('import A', async () => pending.promise);
  const secondError = swContext.runExclusiveForTest('clear B', async () => 'unexpected').then(() => null, (error) => error);
  Promise.resolve(secondError).then((error) => {
    assert(error && error.code === 'JOURNAL_DESTRUCTIVE_BUSY', 'service worker must reject concurrent destructive commands');
  });
  pending.resolve('done');
  first.then((result) => assert.strictEqual(result, 'done'));
  assert(sw.includes("runExclusiveJournalDestructiveMutation('очистка журнала'"));
  assert(sw.includes("error.code = 'JOURNAL_INLINE_IMPORT_DISABLED'"), 'large inline import must not bypass staged streaming path');
  assert(sw.includes("runExclusiveJournalDestructiveMutation('импорт подготовленного журнала'"));
}

function deferredForSw() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}
