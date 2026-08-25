const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

function normalizePath(value) {
  const parts = String(value || '').replace(/^disk:/i, '').split('/').filter(Boolean);
  return parts.length ? `/${parts.join('/')}` : '';
}

function joinPath(...parts) {
  return normalizePath(parts.map((part) => String(part || '').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/'));
}

function notFound() {
  const error = new Error('not found');
  error.status = 404;
  return error;
}

function makeContext({ rootPath = '/Root', accountUid = 'uid-1', api }) {
  const calls = [];
  const context = vm.createContext({
    Promise, Error, String, Number, Math, Array, Boolean, Date,
    YANDEX_UPLOAD_DIR: 'Upload',
    YANDEX_READ_LATER_DIR: 'ReadmeLater',
    YANDEX_TRASH_DIR: 'Trash',
    normalizeDiskPath: normalizePath,
    normalizeYandexDiskPathFromApi: normalizePath,
    normalizeYandexResourceIdFromApi: (value) => String(value || '').trim(),
    normalizeYandexPublicUrlFromApi: (value) => String(value || '').trim(),
    normalizeYandexItemNameFromApi: (value) => String(value || ''),
    joinDiskPath: joinPath,
    getSiteFolderSegments: () => ['site'],
    hostnameFromUrl: () => 'site',
    journalBackupMonthFolderName: () => '08-2026',
    getYandexConfig: async () => ({ rootPath }),
    getCurrentYandexAccountUid: async () => accountUid,
    emitJournalOperationProgress() {},
    appendOperationLogEvent() {},
    yandexApi: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return api(endpoint, options, calls);
    }
  });
  context.calls = calls;
  return context;
}

const finderCode = section(sw, 'async function findYandexFileForJournalEntry', 'function trashConflictFilename');

async function runFinder(context, entry) {
  vm.runInContext(`${finderCode}\nthis.findForTest = findYandexFileForJournalEntry;`, context);
  return context.findForTest(entry, 'op-test');
}

async function testAccountMismatchFailsBeforeRemoteLookup() {
  const context = makeContext({
    accountUid: 'uid-current',
    api: async () => { throw new Error('remote lookup must not run'); }
  });
  await assert.rejects(
    runFinder(context, {
      destination: 'yandex', accountUid: 'uid-stored', rootPath: '/Root', remotePath: '/Root/Upload/site/a.pdf',
      resourceId: 'rid-1', publicUrl: 'https://disk.yandex.ru/d/a', filename: 'a.pdf', hostname: 'site'
    }),
    (error) => error?.code === 'YANDEX_ACCOUNT_MISMATCH'
  );
  assert.strictEqual(context.calls.length, 0, 'account mismatch must fail before any file lookup');
}

async function testRootMismatchFailsBeforeAccountOrRemoteLookup() {
  let accountChecks = 0;
  const context = makeContext({
    rootPath: '/Other',
    api: async () => { throw new Error('remote lookup must not run'); }
  });
  context.getCurrentYandexAccountUid = async () => { accountChecks += 1; return 'uid-1'; };
  await assert.rejects(
    runFinder(context, {
      accountUid: 'uid-1', rootPath: '/Root', remotePath: '/Root/Upload/site/a.pdf', resourceId: 'rid-1', filename: 'a.pdf'
    }),
    (error) => error?.code === 'YANDEX_ROOT_PATH_MISMATCH'
  );
  assert.strictEqual(accountChecks, 0, 'root mismatch should fail before account/network work');
  assert.strictEqual(context.calls.length, 0);
}

async function testKnownResourceIdRejectsPathOnlyAndUsesPublicUrlSecondary() {
  const storedPath = '/Root/Upload/site/a.pdf';
  const publicUrl = 'https://disk.yandex.ru/d/stable';
  const context = makeContext({
    api: async (endpoint, options) => {
      if (endpoint === '/resources/files') {
        return {
          items: [{ type: 'file', path: '/Root/Upload/site/moved-a.pdf', name: 'moved-a.pdf', public_url: publicUrl }],
          total: 1
        };
      }
      const pathValue = options?.query?.path;
      if (pathValue === storedPath) {
        // Same path but no resource_id/public_url: must NOT be accepted once rid is known.
        return { type: 'file', path: storedPath, name: 'a.pdf' };
      }
      throw notFound();
    }
  });
  const found = await runFinder(context, {
    accountUid: 'uid-1', rootPath: '/Root', remotePath: storedPath, resourceId: 'rid-1', publicUrl, filename: 'a.pdf', hostname: 'site'
  });
  assert.strictEqual(found.path, '/Root/Upload/site/moved-a.pdf', 'path-only candidate must be rejected; exact publicUrl may be secondary identity');
  assert(context.calls.some((call) => call.endpoint === '/resources/files'), 'finder must continue to identity search after rejecting path-only candidate');
}

async function testConflictingResourceIdCannotBeOverriddenByMatchingPublicUrl() {
  const storedPath = '/Root/Upload/site/a.pdf';
  const publicUrl = 'https://disk.yandex.ru/d/stable';
  const context = makeContext({
    api: async (endpoint, options) => {
      if (endpoint === '/resources/files') {
        return {
          items: [{ type: 'file', path: '/Root/Upload/site/correct.pdf', resource_id: 'rid-1', public_url: publicUrl }],
          total: 1
        };
      }
      const pathValue = options?.query?.path;
      if (pathValue === storedPath) {
        return { type: 'file', path: storedPath, resource_id: 'rid-wrong', public_url: publicUrl };
      }
      throw notFound();
    }
  });
  const found = await runFinder(context, {
    accountUid: 'uid-1', rootPath: '/Root', remotePath: storedPath, resourceId: 'rid-1', publicUrl, filename: 'a.pdf', hostname: 'site'
  });
  assert.strictEqual(found.resource_id, 'rid-1', 'conflicting stable resourceId must fail closed even if publicUrl matches');
}

async function testLegacyPathCompatibilityRemains() {
  const storedPath = '/Root/Upload/site/legacy.pdf';
  const context = makeContext({
    api: async (endpoint, options) => {
      if (endpoint === '/resources' && options?.query?.path === storedPath) return { type: 'file', path: storedPath, name: 'legacy.pdf' };
      throw notFound();
    }
  });
  const found = await runFinder(context, { remotePath: storedPath, filename: 'legacy.pdf', hostname: 'site' });
  assert.strictEqual(found.path, storedPath, 'legacy entries without stable identity keep managed path compatibility');
}

function testIdentityFieldsAreDurableAndImportable() {
  const pending = section(sw, 'function normalizePendingJournalAppendData', 'async function checkpointPendingJournalAppend');
  assert(pending.includes('accountUid:'), 'durable journal checkpoint must carry accountUid');
  assert(pending.includes('rootPath:'), 'durable journal checkpoint must carry rootPath');

  const append = section(sw, 'async function appendJournalEntry', 'async function updateJournalEntryRecord');
  assert(append.includes('accountUid:'), 'journal entry must persist accountUid');
  assert(append.includes('rootPath:'), 'journal entry must persist rootPath');

  const imported = section(sw, 'function normalizeImportedJournalEntry', 'function makeJournalImportStageId');
  assert(imported.includes('accountUid:'), 'journal import must preserve accountUid');
  assert(imported.includes('rootPath:'), 'journal import must preserve rootPath');

  const upload = section(sw, 'async function uploadCachedRecordToYandex', 'async function downloadCachedPdf');
  assert(upload.includes('const accountUid = await getCurrentYandexAccountUid(operationId);'), 'new Yandex save must bind current account uid');
  assert(upload.includes('accountUid, rootPath'), 'remote checkpoint must capture account/root locator context before remote finalization');
}

(async () => {
  await testAccountMismatchFailsBeforeRemoteLookup();
  await testRootMismatchFailsBeforeAccountOrRemoteLookup();
  await testKnownResourceIdRejectsPathOnlyAndUsesPublicUrlSecondary();
  await testConflictingResourceIdCannotBeOverriddenByMatchingPublicUrl();
  await testLegacyPathCompatibilityRemains();
  testIdentityFieldsAreDurableAndImportable();
  console.log('PASS P1-090 Yandex identity/locator fail-closed design');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
