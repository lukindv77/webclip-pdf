const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

assert(sw.includes('const TAB_CREATE_TIMEOUT_MS = 10_000;'));
assert(sw.includes('const TAB_CREATE_LATE_SUCCESS_TTL_MS = 60_000;'));
assert(sw.includes('const tabCreateSettlements = new Map();'));
const createBlock = section(sw, 'function makeTabCreatePendingError', 'const CONTENT_SCRIPT_MESSAGE_TYPES');
assert(createBlock.includes('chrome.tabs.create(create)'));
assert(createBlock.includes('WEBCLIP_TAB_CREATE_PENDING'));
assert(createBlock.includes('entry.timedOut = true'));
assert(createBlock.includes('entry.lateSuccess = tab'));
assert(createBlock.includes('return createChromeTabBounded(create'));
assert(!/return\s+chrome\.tabs\.create\(create\)/.test(createBlock), 'raw tabs.create return must be removed');

(async () => {
  let createCalls = 0;
  let resolveFirst;
  const firstRaw = new Promise((resolve) => { resolveFirst = resolve; });
  const chrome = {
    tabs: {
      get: async () => ({ id: 7, index: 3, windowId: 2 }),
      create: () => {
        createCalls += 1;
        if (createCalls === 1) return firstRaw;
        return Promise.resolve({ id: 100 + createCalls });
      }
    }
  };
  const context = vm.createContext({ console, Promise, Error, Number, Math, String, Map, setTimeout, clearTimeout, chrome });
  const code = `const TAB_CREATE_TIMEOUT_MS = 20;\nconst TAB_CREATE_LATE_SUCCESS_TTL_MS = 1000;\nconst tabCreateSettlements = new Map();\n${createBlock}\nthis.createForTest = createTabNextTo; this.pendingForTest = tabCreateSettlements;`;
  vm.runInContext(code, context);

  let firstError = null;
  try { await context.createForTest(7, 'https://example.test/a', true); }
  catch (error) { firstError = error; }
  assert(firstError, 'first hung tabs.create must reject locally');
  assert.strictEqual(firstError.code, 'WEBCLIP_TAB_CREATE_PENDING');
  assert.strictEqual(createCalls, 1);
  assert.strictEqual(context.pendingForTest.size, 1, 'raw non-cancellable create remains tracked after local timeout');

  let secondError = null;
  try { await context.createForTest(7, 'https://example.test/a', true); }
  catch (error) { secondError = error; }
  assert(secondError, 'identical retry must stay bounded while original raw call is pending');
  assert.strictEqual(secondError.code, 'WEBCLIP_TAB_CREATE_PENDING');
  assert.strictEqual(createCalls, 1, 'identical retry must not launch duplicate tabs.create');

  resolveFirst({ id: 42 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(context.pendingForTest.size, 1, 'late success receipt must remain briefly for dedupe');

  const recovered = await context.createForTest(7, 'https://example.test/a', true);
  assert.strictEqual(recovered.id, 42, 'retry after late success must receive original tab');
  assert.strictEqual(createCalls, 1, 'late-success retry must not create duplicate tab');
  assert.strictEqual(context.pendingForTest.size, 0, 'late success receipt is consumed once');

  const normal = await context.createForTest(7, 'https://example.test/b', true);
  assert.strictEqual(normal.id, 102);
  assert.strictEqual(createCalls, 2);
  assert.strictEqual(context.pendingForTest.size, 0, 'normal success must clear tracking state');

  console.log('P1-124 bounded tabs.create late-settlement dedupe regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
