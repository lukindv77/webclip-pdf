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
assert(sw.includes('const TAB_GET_TIMEOUT_MS = 5_000;'));
assert.strictEqual((sw.match(/chrome\.tabs\.get\(/g) || []).length, 1);
const getHelper = section(sw, 'function getChromeTabBounded', 'async function createTabNextTo');
assert(getHelper.includes('withOperationTimeout('));
assert(getHelper.includes('chrome.tabs.get(id)'));
for (const expected of [
  "getChromeTabBounded(id, 'Определение позиции новой вкладки')",
  "getChromeTabBounded(tabId, 'Проверка исходной вкладки журнала')",
  "getChromeTabBounded(placementTabId, 'Проверка anchor-вкладки журнала')",
  "getChromeTabBounded(tabId, 'Проверка текущего URL PDF retry cache')",
  "getChromeTabBounded(tabId, 'Чтение URL вкладки для Chrome Action')"
]) assert(sw.includes(expected), `missing bounded caller: ${expected}`);
(async () => {
  let calls = 0;
  const chrome = { tabs: { get() { calls += 1; return new Promise(() => {}); } } };
  function withOperationTimeout(promise, timeoutMs, label) {
    let timer = 0;
    return Promise.race([Promise.resolve(promise), new Promise((_, reject) => { timer = setTimeout(() => { const error = new Error(`${label} timeout`); error.code = 'WEBCLIP_TIMEOUT'; reject(error); }, timeoutMs); })]).finally(() => { if (timer) clearTimeout(timer); });
  }
  const context = vm.createContext({ Promise, Error, Number, Math, chrome, withOperationTimeout });
  vm.runInContext(`const TAB_GET_TIMEOUT_MS = 20;\n${getHelper}\nthis.getForTest = getChromeTabBounded;`, context);
  let error = null;
  try { await context.getForTest(9, 'hung tabs.get'); } catch (e) { error = e; }
  assert(error); assert.strictEqual(error.code, 'WEBCLIP_TIMEOUT'); assert.strictEqual(calls, 1);
  let invalid = null;
  try { await context.getForTest(0); } catch (e) { invalid = e; }
  assert(invalid); assert.strictEqual(invalid.code, 'WEBCLIP_INVALID_TAB_ID'); assert.strictEqual(calls, 1);
  console.log('P1-126 centralized bounded tabs.get regression PASS');
})().catch((error) => { console.error(error); process.exitCode = 1; });
