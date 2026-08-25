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

function withShortDeadline(promise, _timeoutMs, label) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => {
      const error = new Error(`${label}: timeout`);
      error.code = 'TEST_TIMEOUT';
      reject(error);
    }, 5))
  ]);
}

(async () => {
  let config = { original: true };
  let firstSetResolve;
  let setCalls = 0;
  let secondMutatorStarted = false;
  const chrome = {
    storage: {
      local: {
        async get(key) {
          assert.strictEqual(key, 'yandexConfig');
          return { yandexConfig: { ...config } };
        },
        set(payload) {
          setCalls += 1;
          const next = { ...payload.yandexConfig };
          if (setCalls === 1) {
            return new Promise((resolve) => {
              firstSetResolve = () => { config = next; resolve(); };
            });
          }
          config = next;
          return Promise.resolve();
        }
      }
    }
  };

  const context = vm.createContext({
    chrome,
    Promise,
    Error,
    console,
    YANDEX_CONFIG_STORAGE_TIMEOUT_MS: 10_000,
    withOperationTimeout: withShortDeadline,
    waitForUserSettingsImportStorageSettlement: () => Promise.resolve()
  });
  const code = section(swSource, 'let yandexConfigStorageSettlementChain', 'let yandexAuthStorageSettlementChain');
  vm.runInContext(`${code}\nthis.updateYandexConfigForTest = updateYandexConfig;`, context);

  const first = context.updateYandexConfigForTest((value) => ({ ...value, rootPath: '/A' }), 'first');
  await assert.rejects(first, (error) => error?.code === 'TEST_TIMEOUT');
  assert.strictEqual(typeof firstSetResolve, 'function', 'first actual storage.set must still be pending after local timeout');

  const second = context.updateYandexConfigForTest((value) => {
    secondMutatorStarted = true;
    return { ...value, createPublicLinks: false };
  }, 'second');
  await assert.rejects(second, (error) => error?.code === 'TEST_TIMEOUT');
  assert.strictEqual(secondMutatorStarted, false, 'timed-out waiter must not become a phantom mutation later');

  firstSetResolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const third = await context.updateYandexConfigForTest((value) => ({ ...value, clientId: 'client' }), 'third');
  assert.strictEqual(third.rootPath, '/A', 'later mutation must see the actual late-settled prior write');
  assert.strictEqual(third.clientId, 'client');
  assert.strictEqual(config.rootPath, '/A');
  assert.strictEqual(config.clientId, 'client');
  assert.strictEqual(secondMutatorStarted, false);

  const directWrites = [...swSource.matchAll(/chrome\.storage\.local\.set\(\{\s*yandexConfig\s*:/g)];
  assert.strictEqual(directWrites.length, 2, 'yandexConfig writes are serialized helper + P1-008 bundled settings import');
  const helperStart = swSource.indexOf('async function updateYandexConfig');
  assert(directWrites.some((match) => match.index > helperStart && match.index < swSource.indexOf('let yandexAuthStorageSettlementChain')),
    'one direct yandexConfig write must remain inside updateYandexConfig');
  const importStart = swSource.indexOf('async function importUserSettings');
  const importEnd = swSource.indexOf('function openIndexedDbBounded', importStart);
  assert(directWrites.some((match) => match.index > importStart && match.index < importEnd),
    'the second direct yandexConfig write must be the single P1-008 bundled import commit');
  assert(swSource.slice(importStart, importEnd).includes('[USER_SETTINGS_IMPORT_MARKER_KEY]: marker'),
    'P1-008 bundled import write must carry its durable reconciliation marker');

  console.log('PASS P1-116 serialized yandexConfig mutations');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
