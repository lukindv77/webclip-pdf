const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const start = source.indexOf('async function loadYandexBackupsForCurrentMonth');
const end = source.indexOf('async function changeBackupMonth', start);
if (start < 0 || end < 0) throw new Error('backup picker loader not found');
const loaderCode = source.slice(start, end);

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}
function dateMonthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

(async () => {
  assert(source.includes('let yandexBackupListGeneration = 0;'), 'backup month picker must track request generation');
  assert(source.includes('let yandexBackupListLoading = false;'), 'backup month picker must be single-flight');
  assert(source.includes('async function changeBackupMonth(delta) {\n  if (yandexBackupListLoading) return;'), 'month navigation must not mutate month while a list request is active');
  assert(source.includes('backupMonthNext.disabled = true;'), 'both month-navigation directions must be disabled during list loading');

  const pending = new Map();
  const calls = [];
  const renders = [];
  const status = { textContent: '', className: '' };
  const prev = { disabled: false };
  const next = { disabled: false };
  const context = vm.createContext({
    console, Promise, Error, String, Date,
    currentBackupMonth: new Date(2026, 0, 1),
    yandexBackupListGeneration: 0,
    yandexBackupListLoading: false,
    selectedYandexBackupPath: 'old',
    backupPickerProceed: { disabled: false },
    backupPickerList: { replaceChildren() {} },
    backupMonthLabel: { textContent: '' },
    backupMonthNext: next,
    backupMonthPrev: prev,
    backupPickerStatus: status,
    monthStart(value) { const d = new Date(value); return new Date(d.getFullYear(), d.getMonth(), 1); },
    monthKey: dateMonthKey,
    formatMonthLabel: dateMonthKey,
    isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); },
    renderYandexBackupPicker(files, month) { renders.push({ files, month: dateMonthKey(month) }); },
    requireOk(response) { if (!response?.ok) throw new Error(response?.error || 'failed'); },
    sendReadOnlyRuntimeMessage(message) {
      calls.push(message.month);
      const d = deferred();
      pending.set(message.month, d);
      return d.promise;
    }
  });
  vm.runInContext(`${loaderCode}\nthis.loadForTest = loadYandexBackupsForCurrentMonth;\nthis.setMonthForTest = (d) => { currentBackupMonth = d; };`, context);

  const jan = context.loadForTest();
  const duplicate = await context.loadForTest();
  assert.strictEqual(duplicate, false, 'second picker load must be rejected while first is active');
  assert.deepStrictEqual(calls, ['2026-01'], 'single-flight guard must prevent a second Yandex list RPC');
  assert.strictEqual(prev.disabled, true);
  assert.strictEqual(next.disabled, true);

  pending.get('2026-01').resolve({ ok: true, files: [{ path: '/jan' }] });
  await jan;
  assert.strictEqual(renders.length, 1);
  assert.strictEqual(renders[0].month, '2026-01');

  context.setMonthForTest(new Date(2026, 1, 1));
  const feb = context.loadForTest();
  assert.deepStrictEqual(calls, ['2026-01', '2026-02']);
  pending.get('2026-02').resolve({ ok: true, files: [{ path: '/feb' }] });
  await feb;
  assert.strictEqual(renders.length, 2);
  assert.strictEqual(renders[1].month, '2026-02');

  console.log('Yandex backup picker single-flight/stale-state tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
