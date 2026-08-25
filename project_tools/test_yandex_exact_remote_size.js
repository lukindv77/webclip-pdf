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

function testExactSizeHelper() {
  const context = vm.createContext({ Number, Error, String });
  const code = section(swSource, 'function requirePositiveByteSize', 'function normalizeYandexOAuthExpiresIn');
  vm.runInContext(`${code}\nthis.requirePositiveByteSizeForTest = requirePositiveByteSize; this.assertExactYandexRemoteByteSizeForTest = assertExactYandexRemoteByteSize;`, context);

  assert.strictEqual(context.requirePositiveByteSizeForTest(123, 'test'), 123);
  assert.throws(() => context.requirePositiveByteSizeForTest(0, 'test'), (error) => error?.code === 'YANDEX_EXPECTED_SIZE_INVALID');
  assert.throws(() => context.requirePositiveByteSizeForTest(undefined, 'test'), (error) => error?.code === 'YANDEX_EXPECTED_SIZE_INVALID');
  assert.throws(() => context.assertExactYandexRemoteByteSizeForTest(123, 0, 'test'), (error) => error?.code === 'YANDEX_REMOTE_SIZE_UNVERIFIED');
  assert.throws(() => context.assertExactYandexRemoteByteSizeForTest(123, undefined, 'test'), (error) => error?.code === 'YANDEX_REMOTE_SIZE_UNVERIFIED');
  assert.throws(() => context.assertExactYandexRemoteByteSizeForTest(123, 124, 'test'), (error) => error?.code === 'YANDEX_REMOTE_SIZE_MISMATCH');
  assert.strictEqual(context.assertExactYandexRemoteByteSizeForTest(123, 123, 'test'), 123);
}

function assertCallBetween(startMarker, endMarker, needle, label) {
  const code = section(swSource, startMarker, endMarker);
  assert(code.includes(needle), label);
}

function testRemoteSaveAndBackupFlowsRequireExactSize() {
  assertCallBetween(
    'async function uploadCachedRecordToYandex',
    'async function downloadCachedPdf',
    "assertExactYandexRemoteByteSize(expectedPdfBytes, existing?.size",
    'existing remote PDF reuse must require exact positive byte size'
  );
  assertCallBetween(
    'async function uploadCachedRecordToYandex',
    'async function downloadCachedPdf',
    "assertExactYandexRemoteByteSize(expectedPdfBytes, metadata?.size",
    'uploaded PDF verification must require exact positive byte size before finalization'
  );
  assertCallBetween(
    'async function recoverPendingRemoteSaves',
    'async function checkpointPendingLocalDownloadIntent',
    "assertExactYandexRemoteByteSize(expectedBytes, metadata?.size",
    'remote-save recovery must require exact positive byte size'
  );
  assertCallBetween(
    'async function uploadJournalExportStagedToYandex',
    'async function recoverPendingJournalBackup',
    "assertExactYandexRemoteByteSize(pending.expectedBytes, metadata?.size",
    'backup upload verification must require exact positive byte size'
  );
  assertCallBetween(
    'async function recoverPendingJournalBackup',
    'async function exportJournalBackupToYandex',
    "assertExactYandexRemoteByteSize(expectedBytes, metadata?.size",
    'backup recovery must require exact positive byte size'
  );

  assert(!swSource.includes('if (expectedBytes && actualBytes && expectedBytes !== actualBytes)'),
    'fail-open zero/unknown recovery-size comparison must not remain');
  assert(!swSource.includes('if (pending.expectedBytes && Number(metadata.size || 0) !== pending.expectedBytes)'),
    'fail-open backup verification must not remain');
}

testExactSizeHelper();
testRemoteSaveAndBackupFlowsRequireExactSize();
console.log('PASS P0-058 exact Yandex remote byte verification');
