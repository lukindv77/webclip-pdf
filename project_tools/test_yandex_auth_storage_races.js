const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

function bounded(promise, _timeoutMs, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${label} timeout`);
        error.code = 'WEBCLIP_TIMEOUT';
        reject(error);
      }, 5);
    })
  ]).finally(() => clearTimeout(timer));
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

(async () => {
  const context = vm.createContext({
    Promise,
    Error,
    setTimeout,
    clearTimeout,
    YANDEX_AUTH_STORAGE_TIMEOUT_MS: 10_000,
    withOperationTimeout: bounded
  });
  const code = section(source, 'let yandexAuthStorageSettlementChain', 'async function removeLegacyPersistentYandexAuth');
  vm.runInContext(`${code}\nthis.runAuthStorage = runYandexAuthStorageOperation;`, context);

  const events = [];
  const first = context.runAuthStorage(() => {
    events.push('A-start');
    return new Promise((resolve) => setTimeout(() => {
      events.push('A-settle');
      resolve('A');
    }, 40));
  }, 'A');
  await assert.rejects(first, (error) => error && error.code === 'WEBCLIP_TIMEOUT');
  assert.deepStrictEqual(events, ['A-start']);

  const second = context.runAuthStorage(() => {
    events.push('B-start');
    return Promise.resolve('B');
  }, 'B');
  await assert.rejects(second, (error) => error && error.code === 'WEBCLIP_TIMEOUT');
  assert(!events.includes('B-start'), 'new auth side effect must not start while timed-out previous mutation is unresolved');

  await delay(70);
  assert(events.includes('A-settle'), 'first Chrome storage side effect should settle late in the test');
  assert(!events.includes('B-start'), 'operation abandoned by its wait timeout must never start later as a phantom side effect');

  const third = await context.runAuthStorage(() => {
    events.push('C-start');
    return Promise.resolve('C');
  }, 'C');
  assert.strictEqual(third, 'C');
  assert(events.indexOf('C-start') > events.indexOf('A-settle'), 'future mutation may start only after the actual late settlement barrier releases');

  console.log('PASS P0-059/P1-111 Yandex auth storage late-settlement serialization');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
