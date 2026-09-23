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

async function makeContext(removeImpl, {
  sessionAuth = { accessToken: 'session-secret' },
  localAuth = { accessToken: 'legacy-secret' },
  controlGeneration = 7
} = {}) {
  let removeCalls = 0;
  const chrome = {
    storage: {
      local: {
        async get(key) {
          if (key === 'yandexConfig') return { yandexConfig: {} };
          if (key === 'yandexAuth') return { yandexAuth: localAuth };
          return {};
        },
        async remove(key) {
          removeCalls += 1;
          return removeImpl(key);
        },
        async set() {}
      },
      session: {
        async get() {
          return { yandexAuth: sessionAuth, yandexAuthGeneration: controlGeneration };
        },
        async set() {},
        async remove() {}
      }
    }
  };
  const context = vm.createContext({
    chrome, Promise, Error, String, Number, Object, Date, console,
    MAX_YANDEX_CLIENT_ID_CHARS: 512,
    YANDEX_AUTH_STORAGE_TIMEOUT_MS: 10_000,
    withOperationTimeout: (promise) => Promise.resolve(promise),
    normalizeYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    }
  });
  const code = section(source, 'let yandexAuthStorageSettlementChain', 'async function getYandexStatus');
  vm.runInContext(`const YANDEX_AUTH_KEY = 'yandexAuth'; const YANDEX_AUTH_GENERATION_KEY = 'yandexAuthGeneration'; const YANDEX_OAUTH_PENDING_KEY = 'yandexOAuthPending'; const YANDEX_AUTH_STORAGE_SESSION = 'session';\n${code}\nthis.readAuth = readYandexAuthState;`, context);
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
    assert.strictEqual(result.authControlGeneration, 7);
    assert.strictEqual(getRemoveCalls(), 1);
  }

  {
    const tombstone = {
      authRecordId: 'A',
      authGeneration: 8,
      validity: 'invalid',
      expiryKnowledge: 'unknown',
      validityObservedAt: 1234
    };
    const { context, getRemoveCalls } = await makeContext(async () => {}, {
      sessionAuth: tombstone,
      localAuth: { accessToken: 'legacy-secret-that-must-not-resurrect' },
      controlGeneration: 8
    });
    const result = await context.readAuth();
    assert.strictEqual(result.auth.validity, 'invalid');
    assert.strictEqual(result.auth.authRecordId, 'A');
    assert.strictEqual(result.auth.accessToken, undefined);
    assert.strictEqual(result.authControlGeneration, 8);
    assert.strictEqual(getRemoveCalls(), 1, 'authoritative tombstone must clean legacy persistent secret');
  }

  console.log('Yandex legacy token cleanup tests OK; tombstone_blocks_legacy_resurrection=true');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
