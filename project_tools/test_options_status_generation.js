const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

(async () => {
  assert(source.includes('let yandexStatusGeneration = 0;'));
  assert(source.includes('let backupStatusGeneration = 0;'));

  const oldStatus = deferred();
  const clientId = { value: '' };
  const redirectUri = { value: '' };
  const rootPath = { value: '' };
  const publicLinksEnabled = { checked: false };
  const connectionStatus = { className: '', textContent: '' };
  const pendingStatus = { className: '', textContent: '' };
  let backupRefreshes = 0;
  const statusContext = vm.createContext({
    Promise, Error, String, Boolean, Math, Date,
    yandexStatusGeneration: 0,
    clientId, redirectUri, rootPath, publicLinksEnabled, connectionStatus, pendingStatus,
    chrome: { runtime: { sendMessage() { return oldStatus.promise; } } },
    sendReadOnlyRuntimeMessage() { return oldStatus.promise; },
    requireOk(value) { if (!value?.ok) throw new Error(value?.error || 'failed'); },
    async refreshBackupStatus() { backupRefreshes += 1; }
  });
  const refreshCode = section(source, 'async function refreshStatus', 'async function saveRoot');
  vm.runInContext(`${refreshCode}\nthis.refreshStatusForTest = refreshStatus;`, statusContext);

  const old = statusContext.refreshStatusForTest();
  await statusContext.refreshStatusForTest({
    ok: true, connected: true, clientId: 'new-client', redirectUri: 'https://new', rootPath: '/new-root',
    createPublicLinks: true, account: { login: 'new-user' }, authSource: 'oauth', authPending: false
  });
  assert.strictEqual(rootPath.value, '/new-root');
  oldStatus.resolve({
    ok: true, connected: false, clientId: 'old-client', redirectUri: 'https://old', rootPath: '/old-root',
    createPublicLinks: false, authPending: false
  });
  await old;
  assert.strictEqual(rootPath.value, '/new-root', 'late old status must not roll rootPath back');
  assert.strictEqual(clientId.value, 'new-client', 'late old status must not roll clientId back');
  assert.strictEqual(publicLinksEnabled.checked, true, 'late old status must not roll preferences back');
  assert.strictEqual(backupRefreshes, 1, 'stale status must not trigger a secondary backup-status refresh');

  const firstBackup = deferred();
  const secondBackup = deferred();
  let call = 0;
  const rendered = [];
  const backupStatus = { className: '', textContent: '' };
  const backupContext = vm.createContext({
    Promise, Error, String,
    backupStatusGeneration: 0,
    backupStatus,
    chrome: { runtime: { sendMessage() { call += 1; return call === 1 ? firstBackup.promise : secondBackup.promise; } } },
    sendReadOnlyRuntimeMessage() { call += 1; return call === 1 ? firstBackup.promise : secondBackup.promise; },
    requireOk(value) { if (!value?.ok) throw new Error(value?.error || 'failed'); },
    renderBackupStatus(value) { rendered.push(value.marker); }
  });
  const backupCode = section(source, 'async function refreshBackupStatus', 'function renderBackupStatus');
  vm.runInContext(`${backupCode}\nthis.refreshBackupForTest = refreshBackupStatus;`, backupContext);
  const first = backupContext.refreshBackupForTest();
  const second = backupContext.refreshBackupForTest();
  secondBackup.resolve({ ok: true, marker: 'new' });
  await second;
  firstBackup.resolve({ ok: true, marker: 'old' });
  await first;
  assert.deepStrictEqual(rendered, ['new'], 'late old backup status must not overwrite current settings UI');

  console.log('Options Yandex/backup status generation fencing tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
