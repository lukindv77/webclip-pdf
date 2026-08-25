const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'prepared-save-as.js'), 'utf8');
function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

assert(sw.includes("const PREPARED_SAVE_AS_INDEX_KEY = 'webclipPreparedSaveAsIndex';"));
assert(sw.includes("const PREPARED_SAVE_AS_CHECKPOINT_PREFIX = 'webclipPreparedSaveAs:';"));
assert(sw.includes('let preparedSaveAsCheckpointMutationSettlement = Promise.resolve();'));
assert(sw.includes('queuePreparedSaveAsCheckpointMutation'));
assert(sw.includes("preparedSaveAsCheckpointKey(sessionId, 'prepared')"));
assert(sw.includes("preparedSaveAsCheckpointKey(sessionId, 'started')"));
assert(sw.includes("preparedSaveAsCheckpointKey(sessionId, 'released')"));
assert(sw.includes('saveAsSessionId = makePreparedSaveAsSessionId()'));
assert(sw.includes('saveAsSessionId\n              };') || sw.includes('saveAsSessionId'));
assert(helper.includes('saveAsSessionId'));
assert(helper.includes("reason: String(reason || 'page-release')"));
assert(!/Promise\.race\s*\(/.test(helper), 'native Save As must remain page-owned without caller timeout');
assert(!/setTimeout\s*\(/.test(helper), 'native Save As helper must not time out the system dialog');

const helpers = section(sw, 'function normalizePreparedSaveAsSessionId', 'function getChromeAlarmBounded');

(async () => {
  let resolvePreparedSet;
  const events = [];
  const data = {};
  let setCalls = 0;
  const chrome = {
    runtime: { getURL: (value = '') => `chrome-extension://test/${value}` },
    storage: {
      session: {
        async get(keys) {
const list = Array.isArray(keys) ? keys : [keys];
const out = {};
for (const key of list) if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = data[key];
return out;
        },
        set(values) {
setCalls += 1;
const call = setCalls;
events.push(`set-${call}-start`);
if (call === 1) {
  return new Promise((resolve) => {
    resolvePreparedSet = () => {
      Object.assign(data, values);
      events.push('set-1-finish');
      resolve();
    };
  });
}
Object.assign(data, values);
events.push(`set-${call}-finish`);
return Promise.resolve();
        },
        async remove(keys) {
for (const key of (Array.isArray(keys) ? keys : [keys])) delete data[key];
events.push('remove');
        }
      }
    }
  };
  function withOperationTimeout(promise, timeoutMs, label) {
    let timer = 0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
const error = new Error(`${label} timeout`);
error.code = 'WEBCLIP_TIMEOUT';
reject(error);
        }, timeoutMs);
      })
    ]).finally(() => { if (timer) clearTimeout(timer); });
  }
  const context = vm.createContext({
    console, Promise, Error, Number, Math, String, Array, Set, Object, Date,
    setTimeout, clearTimeout, chrome,
    PREPARED_SAVE_AS_CHECKPOINT_TIMEOUT_MS: 20,
    PREPARED_SAVE_AS_INDEX_KEY: 'webclipPreparedSaveAsIndex',
    PREPARED_SAVE_AS_CHECKPOINT_PREFIX: 'webclipPreparedSaveAs:',
    MAX_PREPARED_SAVE_AS_CHECKPOINTS: 64,
    preparedSaveAsCheckpointMutationSettlement: Promise.resolve(),
    withOperationTimeout,
    readChromeStorageBounded: (start) => Promise.resolve().then(start),
    normalizePreparedSaveAsBlobUrl: (value) => String(value),
    revokeBlobUrl: async () => { events.push('revoke'); }
  });
  vm.runInContext(`${helpers}\nthis.createForTest = createPreparedSaveAsCheckpoint; this.releaseForTest = releasePreparedSaveAsCheckpoint;`, context);

  const details = {
    sessionId: 'save-as-race',
    blobUrl: 'blob:chrome-extension://test/a',
    filename: 'Journal.json',
    ownerPage: 'journal.html',
    operationId: 'op-1'
  };
  let prepareError = null;
  try { await context.createForTest(details); } catch (error) { prepareError = error; }
  assert(prepareError && prepareError.code === 'WEBCLIP_TIMEOUT', 'first durable PREPARED write must be locally bounded');
  assert.strictEqual(setCalls, 1);

  const releasePromise = context.releaseForTest({ ...details, reason: 'test-release' });
  await new Promise((resolve) => setTimeout(resolve, 2));
  assert.strictEqual(setCalls, 1, 'RELEASE must not overtake unresolved PREPARED actual settlement');
  resolvePreparedSet();
  await releasePromise;
  assert.strictEqual(setCalls, 2, 'queued RELEASE starts after PREPARED actual settlement');
  assert(events.indexOf('set-1-finish') < events.indexOf('set-2-start'));
  assert(events.indexOf('set-2-finish') < events.indexOf('revoke'), 'Blob revoke must follow durable RELEASE tombstone');
  assert(data['webclipPreparedSaveAs:save-as-race:released'], 'released tombstone must remain durable');
  assert(!data['webclipPreparedSaveAs:save-as-race:prepared'], 'old prepared receipt is removed only after released tombstone');
  console.log('P1-129 prepared Save As durable checkpoint/late-settlement regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
