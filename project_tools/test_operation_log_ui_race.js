const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker}`);
  return text.slice(start, end);
}
function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

(async () => {
  assert(source.includes('let operationLogSelectionGeneration = 0;'), 'list/detail cross-race must have a selection generation');
  assert(source.includes('selectionGenerationAtStart !== operationLogSelectionGeneration'), 'old list refresh must not mutate a newer detail selection');
  assert(source.includes('selectedOperationLogId = \'\';\n    operationLogDetail.classList.add(\'hidden\');'), 'foreground detail load must clear the previous selected operation');
  assert(source.includes("getReadOnlyRuntimeMessageActual({ type: 'WEBCLIP_OPERATION_LOG_GET'"), 'detail read must retain the underlying read until actual settlement');
  assert(source.includes("waitReadOnlyRuntimeMessage(actual, 30000, 'Получение OperationLog')"), 'detail read must remain UI-deadline-bounded');

  const pending = new Map();
  const shown = [];
  const operationLogDetail = { hidden: false, classList: { add() { operationLogDetail.hidden = true; }, remove() { operationLogDetail.hidden = false; } }, scrollIntoView() {} };
  const operationLogTitle = { textContent: '' };
  const operationLogDescription = { textContent: '' };
  const operationLogId = { textContent: '' };
  const operationLogJson = { textContent: '', classList: { remove() {} } };
  const toggle = { textContent: '' };

  const context = vm.createContext({
    console, Promise, Error, String, JSON,
    operationLogDetail, operationLogTitle, operationLogDescription, operationLogId, operationLogJson,
    el(id) { if (id === 'toggleOperationLogText') return toggle; throw new Error(id); },
    showMessage(message, kind) { shown.push({ message, kind }); },
    requireOk(response) { if (!response?.ok) throw new Error(response?.error || 'failed'); return response; },
    getReadOnlyRuntimeMessageActual(message) {
      const d = deferred();
      pending.set(String(message.operationId), d);
      return d.promise;
    },
    waitReadOnlyRuntimeMessage(actual) { return actual; }
  });
  const code = `let selectedOperationLogId = 'previous';\nlet operationLogDetailGeneration = 0;\nlet operationLogSelectionGeneration = 0;\nlet operationLogDetailRequestInFlight = false;\nlet queuedOperationLogDetailRequest = null;\n${between(source, 'function openOperationLog', 'function toggleOperationLogText')}\nthis.openForTest = openOperationLog;\nthis.getSelected = () => selectedOperationLogId;`;
  vm.runInContext(code, context);

  const first = context.openForTest('A');
  assert.strictEqual(context.getSelected(), '', 'starting a foreground detail load must make export unavailable for the previous log');
  const second = context.openForTest('B');
  pending.get('A').resolve({ ok: true, log: { title: 'A title', description: 'A desc' } });
  await first;
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(context.getSelected(), '', 'superseded A response must not become selected while B is queued');
  pending.get('B').resolve({ ok: true, log: { title: 'B title', description: 'B desc' } });
  await second;
  assert.strictEqual(context.getSelected(), 'B');
  assert.strictEqual(operationLogTitle.textContent, 'B title');
  assert.strictEqual(shown.length, 0);

  console.log('Operation log UI stale-response/queue race tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
