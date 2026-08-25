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

async function makeContext(removeImpl) {
  let removeCalls = 0;
  const chrome = {
    storage: {
      local: {
        async get(key) {
          if (key === 'yandexConfig') return { yandexConfig: {} };
          if (key === 'yandexAuth') return { yandexAuth: { accessToken: 'legacy-secret' } };
          return {};
        },
        async remove(key) {
          removeCalls += 1;
          return removeImpl(key);
        },
        async set() {}
      },
      session: {
        async get() { return { yandexAuth: { accessToken: 'session-secret' } }; },
        async set() {},
        async remove() {}
      }
    }
  };
  const context = vm.createContext({ chrome, Promise, Error, String, console, YANDEX_AUTH_STORAGE_TIMEOUT_MS: 10_000, withOperationTimeout: (promise) => Promise.resolve(promise) });
  const code = section(source, 'let yandexAuthStorageSettlementChain', 'async function getYandexStatus');
  vm.runInContext(`const YANDEX_AUTH_KEY = 'yandexAuth'; const YANDEX_AUTH_STORAGE_SESSION = 'session';\n${code}\nthis.readAuth = readYandexAuthState;`, context);
  return { context, getRemoveCalls: () => removeCalls };
}

(async () => {
  {
    const { context, getRemoveCalls } = await makeContext(async () => { throw new Error('storage remove failed'); });
    await assert.rejects(
      context.readAuth(),
      (error) => error && error.code === 'YANDEX_LEGACY_TOKEN_CLEANUP_FAILED'
    );
    assert.strictEqual(getRemoveCalls(), 1, 'persistent legacy token cleanup must be awaited');
  }

  {
    const { context, getRemoveCalls } = await makeContext(async () => {});
    const result = await context.readAuth();
    assert.strictEqual(result.auth.accessToken, 'session-secret');
    assert.strictEqual(getRemoveCalls(), 1);
  }

  console.log('Yandex legacy token cleanup tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
