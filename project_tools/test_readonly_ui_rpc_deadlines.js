const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const optionsSource = fs.readFileSync(path.join(root, 'options.js'), 'utf8');
const journalSource = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker}`);
  return text.slice(start, end);
}

async function verify(source, endMarker, label) {
  const helper = between(source, 'const READ_ONLY_RUNTIME_MAX_IN_FLIGHT', endMarker);
  let calls = 0;
  const pending = new Map();
  const context = vm.createContext({
    Promise, Error, Math, Number, String, JSON, Map,
    setTimeout(fn) { return global.setTimeout(fn, 2); },
    clearTimeout,
    chrome: { runtime: { sendMessage(message) {
      calls += 1;
      return new Promise((resolve) => pending.set(JSON.stringify(message), resolve));
    } } }
  });
  vm.runInContext(`${helper}\nthis.callForTest = sendReadOnlyRuntimeMessage;`, context);

  await assert.rejects(context.callForTest({ type: 'READ_ONLY', key: 1 }, 1000, 'Тестовое чтение'), /не завершилось/);
  await assert.rejects(context.callForTest({ type: 'READ_ONLY', key: 1 }, 1000, 'Тестовое чтение'), /не завершилось/);
  assert.strictEqual(calls, 1, `${label}: retry of same timed-out read must reuse the same underlying RPC`);

  for (let key = 2; key <= 4; key += 1) {
    await assert.rejects(context.callForTest({ type: 'READ_ONLY', key }, 1000, 'Тестовое чтение'), /не завершилось/);
  }
  await assert.rejects(
    context.callForTest({ type: 'READ_ONLY', key: 5 }, 1000, 'Тестовое чтение'),
    /Слишком много незавершённых операций чтения/,
    `${label}: distinct unknown reads must be globally capped`
  );
  assert.strictEqual(calls, 4, `${label}: fifth distinct unresolved read must not reach runtime.sendMessage`);

  for (const resolve of pending.values()) resolve({ ok: true });
  await new Promise((resolve) => setImmediate(resolve));
}

(async () => {
  assert(optionsSource.includes("sendReadOnlyRuntimeMessage({\n      type: 'WEBCLIP_YANDEX_LIST_FOLDERS'"), 'folder picker read must use bounded RPC');
  assert(optionsSource.includes("getReadOnlyRuntimeMessageActual({ type: 'WEBCLIP_OPERATION_LOG_GET'"), 'OperationLog detail must keep its active slot until underlying read settlement');
  assert(optionsSource.includes("waitReadOnlyRuntimeMessage(actual, 30000, 'Получение OperationLog')"), 'OperationLog detail read must keep a bounded UI deadline');
  assert(optionsSource.includes("sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_STORAGE_HEALTH'"), 'storage-health read must use bounded RPC');
  assert(journalSource.includes("sendReadOnlyRuntimeMessage({\n      type: 'WEBCLIP_JOURNAL_YANDEX_LIST_BACKUPS'"), 'backup picker read must use bounded RPC');
  await verify(optionsSource, 'const backupProgressBackdrop', 'options');
  await verify(journalSource, 'const BACKUP_PROGRESS_STAGES', 'journal');
  console.log('Read-only extension-page runtime RPC deadline/late-settlement budget tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
